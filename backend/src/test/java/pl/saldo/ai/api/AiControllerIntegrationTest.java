package pl.saldo.ai.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Clock;
import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.ai.domain.AiClient;
import pl.saldo.ai.domain.AiJsonRequest;
import pl.saldo.ai.domain.AiUnavailableException;
import pl.saldo.category.domain.CategoryEntity;
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
class AiControllerIntegrationTest {

	private static final String SUGGEST_URI = "/api/v1/ai/suggest-category";
	private static final String DESCRIPTION = "Biedronka zakupy na weekend";
	private static final String NO_MATCH_DESCRIPTION = "xyzzy qwerty";
	private static final String GROCERIES = "Artykuły spożywcze";
	private static final String GROCERIES_ANSWER = "{\"categoryName\":\"Artykuły spożywcze\",\"confidence\":91}";
	private static final Sort ORDER = Sort.by(CategoryEntity::getName, CategoryEntity::getId);

	@MockitoBean
	private AiClient aiClient;

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final CategoryRepository categoryRepository;
	private final JwtService jwtService;
	private final Clock clock;

	private UserEntity user;
	private UserEntity otherUser;
	private String token;
	private String otherToken;

	@Autowired
	AiControllerIntegrationTest(MockMvcTester mvc, UserRepository userRepository,
			CategoryRepository categoryRepository, JwtService jwtService, Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.categoryRepository = categoryRepository;
		this.jwtService = jwtService;
		this.clock = clock;
	}

	@BeforeEach
	void setUp() {
		user = userRepository.saveAndFlush(new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
		otherUser = userRepository.saveAndFlush(new UserEntity(
				"anna.nowak@example.com", "stored-hash", "Anna", "Nowak", SupportedCurrency.PLN,
				Instant.now(clock)));
		token = jwtService.generateToken(user);
		otherToken = jwtService.generateToken(otherUser);
	}

	@Test
	void shouldReturnAiSuggestionMappedToSystemCategory() {
		given(aiClient.generateJson(any(AiJsonRequest.class))).willReturn(GROCERIES_ANSWER);

		MvcTestResult result = suggest(token, body(DESCRIPTION));

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.categoryId")
				.isEqualTo(systemCategoryId(GROCERIES).intValue());
		assertThat(result).bodyJson().extractingPath("$.categoryName").isEqualTo(GROCERIES);
		assertThat(result).bodyJson().extractingPath("$.confidence").isEqualTo(91);
		assertThat(result).bodyJson().extractingPath("$.source").isEqualTo("AI");
		assertThat(result).bodyJson().doesNotHavePath("$.userId");
	}

	@Test
	void shouldCallAiOnceForIdenticalDescriptionWithOtherCaseAndSpaces() {
		given(aiClient.generateJson(any(AiJsonRequest.class))).willReturn(GROCERIES_ANSWER);

		suggest(token, body(DESCRIPTION));
		MvcTestResult second = suggest(token, body("  BIEDRONKA   zakupy na weekend "));

		assertThat(second).hasStatus(HttpStatus.OK);
		assertThat(second).bodyJson().extractingPath("$.categoryName").isEqualTo(GROCERIES);
		assertThat(second).bodyJson().extractingPath("$.source").isEqualTo("AI");
		verify(aiClient, times(1)).generateJson(any(AiJsonRequest.class));
	}

	@Test
	void shouldNotShareCacheBetweenUsers() {
		given(aiClient.generateJson(any(AiJsonRequest.class))).willReturn(GROCERIES_ANSWER);

		suggest(token, body(DESCRIPTION));
		suggest(otherToken, body(DESCRIPTION));

		verify(aiClient, times(2)).generateJson(any(AiJsonRequest.class));
	}

	@Test
	void shouldNotShareCacheBetweenTypes() {
		given(aiClient.generateJson(any(AiJsonRequest.class)))
				.willReturn(GROCERIES_ANSWER, "{\"categoryName\":\"Wynagrodzenie\",\"confidence\":90}");

		suggest(token, body(DESCRIPTION));
		MvcTestResult income = suggest(token, body(DESCRIPTION, "INCOME"));

		assertThat(income).hasStatus(HttpStatus.OK);
		assertThat(income).bodyJson().extractingPath("$.categoryId")
				.isEqualTo(systemCategoryId("Wynagrodzenie").intValue());
		assertThat(income).bodyJson().extractingPath("$.categoryName").isEqualTo("Wynagrodzenie");
		verify(aiClient, times(2)).generateJson(any(AiJsonRequest.class));
	}

	@Test
	void shouldFallBackToKeywordsAndNotCacheKeywordResult() {
		given(aiClient.generateJson(any(AiJsonRequest.class))).willThrow(new AiUnavailableException("down"));

		MvcTestResult first = suggest(token, body("Zakupy w Biedronce"));
		MvcTestResult second = suggest(token, body("Zakupy w Biedronce"));

		assertThat(first).hasStatus(HttpStatus.OK);
		assertThat(first).bodyJson().extractingPath("$.categoryName").isEqualTo(GROCERIES);
		assertThat(first).bodyJson().extractingPath("$.confidence").isEqualTo(60);
		assertThat(first).bodyJson().extractingPath("$.source").isEqualTo("KEYWORDS");
		assertThat(second).bodyJson().extractingPath("$.source").isEqualTo("KEYWORDS");
		verify(aiClient, times(2)).generateJson(any(AiJsonRequest.class));
	}

	@Test
	void shouldReturn200WithNullFieldsWhenNothingMatches() {
		given(aiClient.generateJson(any(AiJsonRequest.class)))
				.willReturn("{\"categoryName\":\"Transport\",\"confidence\":30}");

		MvcTestResult result = suggest(token, body(NO_MATCH_DESCRIPTION));

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().hasPath("$.categoryId");
		assertThat(result).bodyJson().hasPath("$.source");
		assertThat(result).bodyJson().extractingPath("$.categoryId").isNull();
		assertThat(result).bodyJson().extractingPath("$.categoryName").isNull();
		assertThat(result).bodyJson().extractingPath("$.confidence").isNull();
		assertThat(result).bodyJson().extractingPath("$.source").isNull();
	}

	@Test
	void shouldNeverOfferAnotherUsersCategory() {
		categoryRepository.saveAndFlush(
				new CategoryEntity(otherUser.getId(), "Cudza kategoria", null, TransactionType.EXPENSE));
		given(aiClient.generateJson(any(AiJsonRequest.class)))
				.willReturn("{\"categoryName\":\"Cudza kategoria\",\"confidence\":95}");

		MvcTestResult result = suggest(token, body(NO_MATCH_DESCRIPTION));

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.categoryId").isNull();
		assertThat(result).bodyJson().extractingPath("$.source").isNull();
		ArgumentCaptor<AiJsonRequest> captor = ArgumentCaptor.forClass(AiJsonRequest.class);
		verify(aiClient).generateJson(captor.capture());
		assertThat(captor.getValue().prompt()).doesNotContain("Cudza kategoria");
	}

	@Test
	void shouldReturn401WithoutTokenAndNotCallAi() {
		MvcTestResult result = mvc.post().uri(SUGGEST_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body(DESCRIPTION))
				.exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		verifyNoInteractions(aiClient);
	}

	private MvcTestResult suggest(String bearerToken, String body) {
		return mvc.post().uri(SUGGEST_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private static String body(String description) {
		return """
				{"description": "%s", "amount": 184.50}""".formatted(description);
	}

	private static String body(String description, String type) {
		return """
				{"description": "%s", "amount": 184.50, "type": "%s"}""".formatted(description, type);
	}

	private Long systemCategoryId(String name) {
		return categoryRepository.findAllByUserIdOrIsDefaultTrue(user.getId(), ORDER).stream()
				.filter(category -> category.isDefault() && name.equals(category.getName()))
				.map(CategoryEntity::getId)
				.findFirst()
				.orElseThrow();
	}

}
