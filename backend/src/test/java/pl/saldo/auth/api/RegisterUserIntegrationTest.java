package pl.saldo.auth.api;

import static org.assertj.core.api.Assertions.assertThat;

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
class RegisterUserIntegrationTest {

	private static final String REGISTER_URI = "/api/v1/auth/register";
	private static final String EMAIL = "Jan.Kowalski@Example.com";
	private static final String PASSWORD = "Secret#123";

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	@Autowired
	RegisterUserIntegrationTest(MockMvcTester mvc, UserRepository userRepository, PasswordEncoder passwordEncoder) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Test
	void shouldCreateUserAndStoreBcryptHashInDatabase() {
		MvcTestResult result = register(json("Jan", "Kowalski", EMAIL, PASSWORD));

		assertThat(result).hasStatus(HttpStatus.CREATED);
		assertThat(result).bodyJson().hasPath("$.id");
		assertThat(result).bodyJson().extractingPath("$.email").isEqualTo(EMAIL);
		assertThat(result).bodyJson().doesNotHavePath("$.password");
		assertThat(result).bodyJson().doesNotHavePath("$.passwordHash");

		UserEntity stored = userRepository.findByEmailIgnoreCase(EMAIL).orElseThrow();
		assertThat(stored.getDefaultCurrency()).isEqualTo(SupportedCurrency.PLN);
		assertThat(stored.getPasswordHash()).startsWith("$2a$12$").isNotEqualTo(PASSWORD);
		assertThat(passwordEncoder.matches(PASSWORD, stored.getPasswordHash())).isTrue();
	}

	@Test
	void shouldReturn409AndKeepSingleRowForEmailDuplicatedWithDifferentCase() {
		register(json("Jan", "Kowalski", EMAIL, PASSWORD));

		MvcTestResult result = register(json("Anna", "Nowak", EMAIL.toLowerCase(), PASSWORD));

		assertThat(result).hasStatus(HttpStatus.CONFLICT);
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Adres e-mail jest już zajęty przez inne konto");
		assertThat(userRepository.count()).isEqualTo(1);
	}

	@Test
	void shouldReturn400WithFieldErrorsForBlankEmailAndShortPasswordAndSaveNothing() {
		MvcTestResult result = register(json("Jan", "Kowalski", "", "Ab1!xyz"));

		assertThat(result).hasStatus(HttpStatus.BAD_REQUEST);
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].field").isEqualTo("email");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[0].message")
				.isEqualTo("Adres e-mail jest wymagany");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[1].field").isEqualTo("password");
		assertThat(result).bodyJson().extractingPath("$.fieldErrors[1].message")
				.isEqualTo("Hasło musi mieć od 8 do 64 znaków");
		assertThat(userRepository.count()).isZero();
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

}

