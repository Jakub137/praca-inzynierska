package pl.saldo.auth.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@Transactional
class LoginIntegrationTest {

	private static final String LOGIN_URI = "/api/v1/auth/login";
	private static final String EMAIL = "Jan.Kowalski@Example.com";
	private static final String PASSWORD = "Secret#123";
	private static final String WRONG_PASSWORD = "Wrong#123";

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final Clock clock;

	@Autowired
	LoginIntegrationTest(MockMvcTester mvc, UserRepository userRepository, PasswordEncoder passwordEncoder,
			Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.clock = clock;
	}

	@BeforeEach
	void setUp() {
		userRepository.saveAndFlush(new UserEntity(
				EMAIL, passwordEncoder.encode(PASSWORD), "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
	}

	@Test
	void shouldReturnTokenExpiryAndUserWithoutCreatedAtOrPassword() {
		MvcTestResult result = login(EMAIL, PASSWORD);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.accessToken").asString().isNotBlank();
		assertThat(result).bodyJson().extractingPath("$.expiresIn").isEqualTo(86400);
		assertThat(result).bodyJson().extractingPath("$.user.email").isEqualTo(EMAIL);
		assertThat(result).bodyJson().extractingPath("$.user.defaultCurrency").isEqualTo("PLN");
		assertThat(result).bodyJson().doesNotHavePath("$.user.createdAt");
		assertThat(result).bodyJson().doesNotHavePath("$.user.passwordHash");
		assertThat(result).bodyText().doesNotContain(PASSWORD);
	}

	@Test
	void shouldLogInWhenEmailHasDifferentCaseAndSurroundingSpaces() {
		MvcTestResult result = login("  jan.kowalski@example.com  ", PASSWORD);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.user.email").isEqualTo(EMAIL);
	}

	@Test
	void shouldReturnIdenticalProblemForWrongPasswordAndUnknownEmail() {
		MvcTestResult wrongPassword = login(EMAIL, WRONG_PASSWORD);
		MvcTestResult unknownEmail = login("nobody@example.com", PASSWORD);

		for (MvcTestResult result : new MvcTestResult[] { wrongPassword, unknownEmail }) {
			assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
			assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Nieudane logowanie");
			assertThat(result).bodyJson().extractingPath("$.detail")
					.isEqualTo("Nieprawidłowy adres e-mail lub hasło.");
			assertThat(result).bodyText().doesNotContain(PASSWORD).doesNotContain(WRONG_PASSWORD);
		}
	}

	@Test
	void shouldReturn400WithFieldErrorsForBlankCredentials() {
		MvcTestResult result = login("", "");

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("email");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[1].field").isEqualTo("password");
	}

	private MvcTestResult login(String email, String password) {
		return mvc.post().uri(LOGIN_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"%s","password":"%s"}
						""".formatted(email, password))
				.exchange();
	}

}
