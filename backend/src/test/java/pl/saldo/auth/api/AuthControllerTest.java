package pl.saldo.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import pl.saldo.auth.usecase.GetCurrentUserUseCase;
import pl.saldo.auth.usecase.LoginResult;
import pl.saldo.auth.usecase.LoginUserCommand;
import pl.saldo.auth.usecase.LoginUserUseCase;
import pl.saldo.auth.usecase.RegisterUserCommand;
import pl.saldo.auth.usecase.RegisterUserUseCase;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.PasswordPolicy;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.shared.security.UserPrincipal;
import pl.saldo.user.api.UserResponse;
import pl.saldo.user.domain.UserAlreadyExistsException;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(AuthController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class AuthControllerTest {

	private static final String REGISTER_URI = "/api/v1/auth/register";
	private static final String LOGIN_URI = "/api/v1/auth/login";
	private static final String ME_URI = "/api/v1/auth/me";
	private static final String TOKEN = "jwt-value";
	private static final String EMAIL = "jan.kowalski@example.com";
	private static final String PASSWORD = "Secret#123";

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private RegisterUserUseCase registerUserUseCase;

	@MockitoBean
	private LoginUserUseCase loginUserUseCase;

	@MockitoBean
	private GetCurrentUserUseCase getCurrentUserUseCase;

	@MockitoBean
	private JwtService jwtService;

	@MockitoBean
	private UserRepository userRepository;

	@Test
	void shouldReturn201WithUserWithoutPasswordOrHash() {
		given(registerUserUseCase.execute(any(RegisterUserCommand.class))).willReturn(userResponse());

		MvcTestResult result = register(json("Jan", "Kowalski", EMAIL, PASSWORD));

		assertThat(result).hasStatus(HttpStatus.CREATED);
		assertThat(result).bodyJson().extractingPath("$.email").isEqualTo(EMAIL);
		assertThat(result).bodyJson().extractingPath("$.defaultCurrency").isEqualTo("PLN");
		assertThat(result).bodyJson().hasPath("$.id");
		assertThat(result).bodyJson().doesNotHavePath("$.password");
		assertThat(result).bodyJson().doesNotHavePath("$.passwordHash");
		assertThat(result).bodyText().doesNotContain(PASSWORD);
		then(registerUserUseCase).should().execute(new RegisterUserCommand("Jan", "Kowalski", EMAIL, PASSWORD));
	}

	@Test
	void shouldReturn400WithFieldErrorsSortedByFieldAndWithoutRejectedValues() {
		String shortPassword = "Ab1!xyz";

		MvcTestResult result = register(json("", "Kowalski", "", shortPassword));

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Błąd walidacji");
		assertThat(result).bodyJson().extractingPath("$.status").isEqualTo(400);
		assertThat(result).bodyJson().hasPath("$.timestamp");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors").asArray().hasSize(3);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("email");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Adres e-mail jest wymagany");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[1].field").isEqualTo("firstName");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[1].message").isEqualTo("Imię jest wymagane");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[2].field").isEqualTo("password");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[2].message")
				.isEqualTo(PasswordPolicy.LENGTH_MESSAGE);
		assertThat(result).bodyJson().doesNotHavePath("$.fieldErrors[0].rejectedValue");
		assertThat(result).bodyText().doesNotContain(shortPassword);
		then(registerUserUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn409WithPolishMessageWhenEmailIsTaken() {
		given(registerUserUseCase.execute(any(RegisterUserCommand.class))).willThrow(new UserAlreadyExistsException());

		MvcTestResult result = register(json("Jan", "Kowalski", EMAIL, PASSWORD));

		assertThat(result).hasStatus(HttpStatus.CONFLICT);
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Adres e-mail jest już zajęty przez inne konto");
		assertThat(result).bodyJson().hasPath("$.timestamp");
		assertThat(result).bodyText().doesNotContain("already exists");
	}

	@Test
	void shouldReturn400WithPolishDetailForMalformedJson() {
		MvcTestResult result = register("{not-json");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Nie można odczytać żądania. Sprawdź format przesyłanych danych.");
		assertThat(result).bodyText().doesNotContain("Failed to read");
		then(registerUserUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn405ForUnsupportedMethod() {
		MvcTestResult result = mvc.get().uri(REGISTER_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.METHOD_NOT_ALLOWED);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Metoda niedozwolona");
	}

	@Test
	void shouldReturn415ForNonJsonContentType() {
		MvcTestResult result = mvc.post().uri(REGISTER_URI)
				.contentType(MediaType.TEXT_PLAIN)
				.content("plain text")
				.exchange();

		assertThat(result).hasStatus(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nieobsługiwany format danych");
	}

	@Test
	void shouldReturn500WithGenericMessageAndNoInternalDetails() {
		given(registerUserUseCase.execute(any(RegisterUserCommand.class)))
				.willThrow(new RuntimeException("secret-internal-detail"));

		MvcTestResult result = register(json("Jan", "Kowalski", EMAIL, PASSWORD));

		assertThat(result).hasStatus(HttpStatus.INTERNAL_SERVER_ERROR);
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");
		assertThat(result).bodyText().doesNotContain("secret-internal-detail");
	}

	@Test
	void shouldAcceptPasswordOfExactlySeventyTwoUtf8Bytes() {
		given(registerUserUseCase.execute(any(RegisterUserCommand.class))).willReturn(userResponse());

		MvcTestResult result = register(json("Jan", "Kowalski", EMAIL, "A1!" + "ą".repeat(34) + "a"));

		assertThat(result).hasStatus(HttpStatus.CREATED);
	}

	@Test
	void shouldRejectPasswordOfSeventyThreeUtf8BytesBeforeReachingUseCase() {
		MvcTestResult result = register(json("Jan", "Kowalski", EMAIL, "A1!" + "ą".repeat(35)));

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("password");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo(PasswordPolicy.TOO_MANY_BYTES_MESSAGE);
		then(registerUserUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn200WithAuthResponseWithoutCreatedAtOrPassword() {
		UserResponse user = userResponse();
		given(loginUserUseCase.execute(any(LoginUserCommand.class)))
				.willReturn(new LoginResult("jwt-value", 86400L, user));

		MvcTestResult result = login(loginJson(EMAIL, PASSWORD));

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.accessToken").isEqualTo("jwt-value");
		assertThat(result).bodyJson().extractingPath("$.expiresIn").isEqualTo(86400);
		assertThat(result).bodyJson().extractingPath("$.user.id").isEqualTo(user.id().toString());
		assertThat(result).bodyJson().extractingPath("$.user.email").isEqualTo(EMAIL);
		assertThat(result).bodyJson().extractingPath("$.user.firstName").isEqualTo("Jan");
		assertThat(result).bodyJson().extractingPath("$.user.lastName").isEqualTo("Kowalski");
		assertThat(result).bodyJson().extractingPath("$.user.defaultCurrency").isEqualTo("PLN");
		assertThat(result).bodyJson().doesNotHavePath("$.user.createdAt");
		assertThat(result).bodyJson().doesNotHavePath("$.user.passwordHash");
		assertThat(result).bodyText().doesNotContain(PASSWORD);
		then(loginUserUseCase).should().execute(new LoginUserCommand(EMAIL, PASSWORD));
	}

	@Test
	void shouldReturn401WithPolishMessageForBadCredentials() {
		given(loginUserUseCase.execute(any(LoginUserCommand.class)))
				.willThrow(new BadCredentialsException("Invalid credentials"));

		MvcTestResult result = login(loginJson(EMAIL, PASSWORD));

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nieudane logowanie");
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Nieprawidłowy adres e-mail lub hasło.");
		assertThat(result).bodyJson().hasPath("$.timestamp");
		assertThat(result).bodyText().doesNotContain(PASSWORD).doesNotContain("Invalid credentials");
	}

	@Test
	void shouldReturn400WithFieldErrorsForBlankCredentialsWithoutCallingUseCase() {
		MvcTestResult result = login(loginJson("", ""));

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors").asArray().hasSize(2);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("email");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Adres e-mail jest wymagany");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[1].field").isEqualTo("password");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[1].message").isEqualTo("Hasło jest wymagane");
		then(loginUserUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn200WithProfileIncludingCreatedAtForValidToken() {
		UserResponse user = userResponse();
		authenticateAs(user);
		given(getCurrentUserUseCase.execute(user.id())).willReturn(user);

		MvcTestResult result = me(TOKEN);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(user.id().toString());
		assertThat(result).bodyJson().extractingPath("$.email").isEqualTo(EMAIL);
		assertThat(result).bodyJson().extractingPath("$.firstName").isEqualTo("Jan");
		assertThat(result).bodyJson().extractingPath("$.lastName").isEqualTo("Kowalski");
		assertThat(result).bodyJson().extractingPath("$.defaultCurrency").isEqualTo("PLN");
		assertThat(result).bodyJson().hasPath("$.createdAt");
		assertThat(result).bodyJson().doesNotHavePath("$.password");
		assertThat(result).bodyJson().doesNotHavePath("$.passwordHash");
		then(getCurrentUserUseCase).should().execute(user.id());
	}

	@Test
	void shouldReturn401WithoutTokenAndNotCallUseCase() {
		MvcTestResult result = mvc.get().uri(ME_URI).exchange();

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Brak autoryzacji");
		assertThat(result).bodyJson().hasPath("$.timestamp");
		then(getCurrentUserUseCase).shouldHaveNoInteractions();
	}

	@Test
	void shouldReturn401WithGenericMessageWhenUserFromTokenNoLongerExists() {
		UserResponse user = userResponse();
		authenticateAs(user);
		given(getCurrentUserUseCase.execute(user.id()))
				.willThrow(new InsufficientAuthenticationException("Authenticated user no longer exists"));

		MvcTestResult result = me(TOKEN);

		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Brak autoryzacji");
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Wymagane jest zalogowanie. Zaloguj się ponownie.");
		assertThat(result).bodyText().doesNotContain("no longer exists");
	}


	private MvcTestResult register(String body) {
		return mvc.post().uri(REGISTER_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private MvcTestResult login(String body) {
		return mvc.post().uri(LOGIN_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
	}

	private MvcTestResult me(String token) {
		return mvc.get().uri(ME_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.exchange();
	}

	private void authenticateAs(UserResponse user) {
		UserEntity entity = new UserEntity(
				user.email(), "stored-hash", user.firstName(), user.lastName(), user.defaultCurrency(), user.createdAt());
		ReflectionTestUtils.setField(entity, "id", user.id());
		given(jwtService.extractUserId(TOKEN)).willReturn(user.id());
		given(userRepository.findById(user.id())).willReturn(Optional.of(entity));
		given(jwtService.isTokenValid(eq(TOKEN), any(UserPrincipal.class))).willReturn(true);
	}

	private static String loginJson(String email, String password) {
		return """
				{"email":"%s","password":"%s"}
				""".formatted(email, password);
	}

	private static String json(String firstName, String lastName, String email, String password) {
		return """
				{"firstName":"%s","lastName":"%s","email":"%s","password":"%s"}
				""".formatted(firstName, lastName, email, password);
	}

	private static UserResponse userResponse() {
		return new UserResponse(UUID.randomUUID(), EMAIL, "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.parse("2026-11-14T10:15:30Z"));
	}

}
