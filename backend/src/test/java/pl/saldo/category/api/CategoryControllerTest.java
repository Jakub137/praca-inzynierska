package pl.saldo.category.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import pl.saldo.category.usecase.GetCategoriesUseCase;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(CategoryController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class CategoryControllerTest {

	private static final String CATEGORIES_URI = "/api/v1/categories";
	private static final String TOKEN = "jwt-value";
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private GetCategoriesUseCase getCategoriesUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn200WithCategoriesAndIsDefaultFlag() {
		authenticate();
		given(getCategoriesUseCase.execute(USER_ID)).willReturn(List.of(
				new CategoryResponse(1L, "Transport", "car", TransactionType.EXPENSE, true),
				new CategoryResponse(12L, "Bilety", null, TransactionType.EXPENSE, false)));

		MvcTestResult result = getCategories();

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.length()").isEqualTo(2);
		assertThat(result).bodyJson().extractingPath("$[0].id").isEqualTo(1);
		assertThat(result).bodyJson().extractingPath("$[0].name").isEqualTo("Transport");
		assertThat(result).bodyJson().extractingPath("$[0].icon").isEqualTo("car");
		assertThat(result).bodyJson().extractingPath("$[0].type").isEqualTo("EXPENSE");
		assertThat(result).bodyJson().extractingPath("$[0].isDefault").isEqualTo(true);
		assertThat(result).bodyJson().extractingPath("$[1].icon").isNull();
		assertThat(result).bodyJson().extractingPath("$[1].isDefault").isEqualTo(false);
		assertThat(result).bodyJson().doesNotHavePath("$[0].default");
		assertThat(result).bodyJson().doesNotHavePath("$[0].userId");
		then(getCategoriesUseCase).should().execute(USER_ID);
	}

	@Test
	void shouldReturn401WithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.get().uri(CATEGORIES_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		then(getCategoriesUseCase).shouldHaveNoInteractions();
	}

	private MvcTestResult getCategories() {
		return mvc.get().uri(CATEGORIES_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + TOKEN)
				.exchange();
	}

	private void authenticate() {
		UserEntity entity = new UserEntity(
				"jan.kowalski@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN, NOW);
		ReflectionTestUtils.setField(entity, "id", USER_ID);
		given(jwtService.extractUserId(TOKEN)).willReturn(USER_ID);
		given(userRepository.findById(USER_ID)).willReturn(Optional.of(entity));
		given(jwtService.isTokenValid(eq(TOKEN), any(UserPrincipal.class))).willReturn(true);
	}

}
