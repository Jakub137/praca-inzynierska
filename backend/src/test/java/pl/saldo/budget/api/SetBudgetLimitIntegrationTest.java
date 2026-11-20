package pl.saldo.budget.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.budget.domain.BudgetLimitEntity;
import pl.saldo.budget.infrastructure.BudgetLimitRepository;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.security.JwtService;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class SetBudgetLimitIntegrationTest {

	private static final String LIMITS_URI = "/api/v1/budget-limits";
	private static final int MONTH = 11;
	private static final int YEAR = 2026;

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final BudgetLimitRepository budgetLimitRepository;
	private final JwtService jwtService;
	private final Clock clock;

	private UserEntity user;
	private Long categoryId;
	private String token;

	@Autowired
	SetBudgetLimitIntegrationTest(MockMvcTester mvc, UserRepository userRepository,
			CategoryRepository categoryRepository, BudgetLimitRepository budgetLimitRepository,
			JwtService jwtService, Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.categoryRepository = categoryRepository;
		this.budgetLimitRepository = budgetLimitRepository;
		this.jwtService = jwtService;
		this.clock = clock;
	}

	@BeforeEach
	void setUp() {
		user = userRepository.saveAndFlush(new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
		categoryId = categoryRepository.findAllByUserIdOrIsDefaultTrue(user.getId(), Sort.by("id")).stream()
				.filter(category -> category.isDefault() && category.getType() == TransactionType.EXPENSE)
				.findFirst()
				.orElseThrow()
				.getId();
		token = jwtService.generateToken(user);
	}

	@Test
	void shouldCreateThenUpdateSingleRowForSameCategoryMonthAndYear() {
		MvcTestResult created = setLimit("1500.00");
		MvcTestResult updated = setLimit("1800.50");

		assertThat(created).hasStatus(HttpStatus.CREATED);
		assertThat(created).bodyJson().extractingPath("$.categoryId").isEqualTo(categoryId.intValue());
		assertThat(created).bodyJson().extractingPath("$.month").isEqualTo(MONTH);
		assertThat(created).bodyJson().extractingPath("$.year").isEqualTo(YEAR);
		assertThat(created).bodyJson().extractingPath("$.limitAmount").isEqualTo(1500.0);
		assertThat(updated).hasStatus(HttpStatus.OK);
		assertThat(updated).bodyJson().extractingPath("$.limitAmount").isEqualTo(1800.5);

		List<BudgetLimitEntity> rows = budgetLimitRepository.findAll().stream()
				.filter(limit -> limit.getUserId().equals(user.getId()))
				.toList();
		assertThat(rows).hasSize(1);
		assertThat(rows.get(0).getLimitAmount()).isEqualByComparingTo(new BigDecimal("1800.50"));
		assertThat(updated).bodyJson().extractingPath("$.id").isEqualTo(rows.get(0).getId().intValue());
	}

	private MvcTestResult setLimit(String amount) {
		return mvc.post().uri(LIMITS_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"categoryId": %d, "month": %d, "year": %d, "limitAmount": %s}
						""".formatted(categoryId, MONTH, YEAR, amount))
				.exchange();
	}

}
