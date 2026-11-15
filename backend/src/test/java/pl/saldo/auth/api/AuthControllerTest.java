package pl.saldo.auth.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

import pl.saldo.auth.usecase.RegisterUserCommand;
import pl.saldo.auth.usecase.RegisterUserUseCase;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.config.ClockConfiguration;
import pl.saldo.shared.security.JwtService;
import pl.saldo.shared.security.PasswordPolicy;
import pl.saldo.shared.security.SecurityConfiguration;
import pl.saldo.user.api.UserResponse;
import pl.saldo.user.domain.UserAlreadyExistsException;
import pl.saldo.user.infrastructure.UserRepository;

@WebMvcTest(AuthController.class)
@Import({ ClockConfiguration.class, SecurityConfiguration.class })
class AuthControllerTest {

	private static final String REGISTER_URI = "/api/v1/auth/register";
	private static final String EMAIL = "jan.kowalski@example.com";
	private static final String PASSWORD = "Secret#123";

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private RegisterUserUseCase registerUserUseCase;

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

	private MvcTestResult register(String body) {
		return mvc.post().uri(REGISTER_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body)
				.exchange();
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
