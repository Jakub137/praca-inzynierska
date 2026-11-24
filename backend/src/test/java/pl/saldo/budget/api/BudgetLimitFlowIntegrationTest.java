package pl.saldo.budget.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.BusinessTime;
import pl.saldo.shared.security.JwtService;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class BudgetLimitFlowIntegrationTest {

	private static final String CATEGORIES_URI = "/api/v1/categories";
	private static final String LIMITS_URI = "/api/v1/budget-limits";
	private static final String TRANSACTIONS_URI = "/api/v1/transactions";

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final JwtService jwtService;
	private final Clock clock;

	private String token;
	private LocalDate today;
	private long categoryId;

	@Autowired
	BudgetLimitFlowIntegrationTest(MockMvcTester mvc, UserRepository userRepository, JwtService jwtService,
			Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.jwtService = jwtService;
		this.clock = clock;
	}

	@BeforeEach
	void setUp() {
		UserEntity user = userRepository.saveAndFlush(new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
		token = jwtService.generateToken(user);
		today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
		// Not a name from the V2_1 seed: a user category with a system category name is rejected with 409 (T-033).
		categoryId = createCategory("Koncerty");
		setLimit("1000.00");
	}

	@Test
	void shouldReturnWarningWhenExpensesReach85PercentOfLimit() {
		addExpense("600.00");
		addExpense("250.00");

		MvcTestResult usage = getUsage();

		assertThat(usage).hasStatus(HttpStatus.OK);
		assertThat(usage).bodyJson().extractingPath("$.length()").isEqualTo(1);
		assertThat(usage).bodyJson().extractingPath("$[0].limitAmount").isEqualTo(1000.0);
		assertThat(usage).bodyJson().extractingPath("$[0].spentAmount").isEqualTo(850.0);
		assertThat(usage).bodyJson().extractingPath("$[0].percentage").isEqualTo(85.0);
		assertThat(usage).bodyJson().extractingPath("$[0].status").isEqualTo("WARNING");
	}

	@Test
	void shouldReturnExceededWhenExpensesReach105PercentOfLimit() {
		addExpense("1050.00");

		MvcTestResult usage = getUsage();

		assertThat(usage).hasStatus(HttpStatus.OK);
		assertThat(usage).bodyJson().extractingPath("$.length()").isEqualTo(1);
		assertThat(usage).bodyJson().extractingPath("$[0].limitAmount").isEqualTo(1000.0);
		assertThat(usage).bodyJson().extractingPath("$[0].spentAmount").isEqualTo(1050.0);
		assertThat(usage).bodyJson().extractingPath("$[0].percentage").isEqualTo(105.0);
		assertThat(usage).bodyJson().extractingPath("$[0].status").isEqualTo("EXCEEDED");
	}

	private long createCategory(String name) {
		MvcTestResult result = mvc.post().uri(CATEGORIES_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"name": "%s", "type": "EXPENSE"}""".formatted(name))
				.exchange();
		assertThat(result).hasStatus(HttpStatus.CREATED);
		return JsonPath.<Number>read(responseBody(result), "$.id").longValue();
	}

	private void setLimit(String limitAmount) {
		MvcTestResult result = mvc.post().uri(LIMITS_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"categoryId": %d, "month": %d, "year": %d, "limitAmount": %s}"""
						.formatted(categoryId, today.getMonthValue(), today.getYear(), limitAmount))
				.exchange();
		assertThat(result).hasStatus(HttpStatus.CREATED);
	}

	private void addExpense(String amount) {
		MvcTestResult result = mvc.post().uri(TRANSACTIONS_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"amount": %s, "currency": "PLN", "categoryId": %d, "date": "%s", "type": "EXPENSE"}"""
						.formatted(amount, categoryId, today))
				.exchange();
		assertThat(result).hasStatus(HttpStatus.CREATED);
	}

	private MvcTestResult getUsage() {
		return mvc.get().uri(LIMITS_URI + "/usage?month=" + today.getMonthValue() + "&year=" + today.getYear())
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.exchange();
	}

	private static String responseBody(MvcTestResult result) {
		try {
			return result.getResponse().getContentAsString();
		} catch (UnsupportedEncodingException e) {
			throw new IllegalStateException(e);
		}
	}

}
