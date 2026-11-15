package pl.saldo.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jayway.jsonpath.JsonPath;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@Import({ TestcontainersConfiguration.class, SecurityIntegrationTest.ProbeController.class })
@Transactional
class SecurityIntegrationTest {

	private static final String WHOAMI_URI = "/api/v1/security-probe/whoami";
	private static final String FORBIDDEN_URI = "/api/v1/security-probe/forbidden";
	private static final String HEALTH_URI = "/api/v1/health";
	private static final String LOGIN_URI = "/api/v1/auth/login";
	private static final String ME_URI = "/api/v1/auth/me";
	private static final String UNLISTED_AUTH_URI = "/api/v1/auth/unlisted";
	private static final String EMAIL = "jan.kowalski@example.com";
	private static final String PASSWORD = "Secret#123";
	private static final Duration PAST_OFFSET = Duration.ofDays(-2);
	private static final byte OTHER_KEY_FILL = 9;
	private static final int OTHER_KEY_LENGTH_BYTES = 48;

	private final MockMvcTester mvc;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final JwtProperties jwtProperties;
	private final Clock clock;

	@Autowired
	SecurityIntegrationTest(MockMvcTester mvc, UserRepository userRepository, PasswordEncoder passwordEncoder,
			JwtService jwtService, JwtProperties jwtProperties, Clock clock) {
		this.mvc = mvc;
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		this.jwtProperties = jwtProperties;
		this.clock = clock;
	}

	@Test
	void shouldReturn401WithoutAuthorizationHeader() {
		MvcTestResult result = mvc.get().uri(WHOAMI_URI).exchange();

		assertUnauthorized(result);
	}

	@Test
	void shouldReturn401ForAuthorizationHeaderWithOtherScheme() {
		MvcTestResult result = mvc.get().uri(WHOAMI_URI)
				.header(HttpHeaders.AUTHORIZATION, "Basic dXNlcjpwYXNz")
				.exchange();

		assertUnauthorized(result);
	}

	@Test
	void shouldReturn401ForEmptyBearerToken() {
		MvcTestResult result = mvc.get().uri(WHOAMI_URI)
				.header(HttpHeaders.AUTHORIZATION, "Bearer ")
				.exchange();

		assertUnauthorized(result);
	}

	@Test
	void shouldReturn200AndLoadPrincipalForValidToken() {
		UserEntity user = saveUser();

		MvcTestResult result = getWithToken(WHOAMI_URI, jwtService.generateToken(user));

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(user.getId().toString());
		assertThat(result).bodyJson().extractingPath("$.email").isEqualTo(EMAIL);
	}

	@Test
	void shouldAuthenticateWithTokenReturnedByLogin() {
		UserEntity user = saveUser();
		MvcTestResult login = mvc.post().uri(LOGIN_URI)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email":"%s","password":"%s"}
						""".formatted(EMAIL, PASSWORD))
				.exchange();
		assertThat(login).hasStatus(HttpStatus.OK);
		String token = JsonPath.read(responseBody(login), "$.accessToken");

		MvcTestResult result = getWithToken(WHOAMI_URI, token);

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(user.getId().toString());
	}

	@Test
	void shouldReturn401ForMalformedToken() {
		assertUnauthorized(getWithToken(WHOAMI_URI, "not-a-jwt"));
	}

	@Test
	void shouldReturn401ForTokenSignedWithOtherKey() {
		UserEntity user = saveUser();
		JwtService foreignService = new JwtService(new JwtProperties(otherEncodedKey(), jwtProperties.expiration()), clock);

		assertUnauthorized(getWithToken(WHOAMI_URI, foreignService.generateToken(user)));
	}

	@Test
	void shouldReturn401ForExpiredToken() {
		UserEntity user = saveUser();
		JwtService pastService = new JwtService(jwtProperties, Clock.offset(clock, PAST_OFFSET));

		assertUnauthorized(getWithToken(WHOAMI_URI, pastService.generateToken(user)));
	}

	@Test
	void shouldReturn401WhenUserFromTokenNoLongerExists() {
		UserEntity user = saveUser();
		String token = jwtService.generateToken(user);
		userRepository.delete(user);
		userRepository.flush();

		assertUnauthorized(getWithToken(WHOAMI_URI, token));
	}

	@Test
	void shouldReturn401ForInvalidTokenOnPublicEndpoint() {
		assertUnauthorized(getWithToken(HEALTH_URI, "not-a-jwt"));
	}

	@Test
	void shouldReturn200ForPublicEndpointWithoutToken() {
		assertThat(mvc.get().uri(HEALTH_URI).exchange()).hasStatus(HttpStatus.OK);
	}

	// The 403 body comes from GlobalExceptionHandler (the controller throws AccessDeniedException inside MVC),
	// not from the AccessDeniedHandler of the filter chain, which no endpoint reaches until roles exist.
	@Test
	void shouldReturn403WithPolishMessageWhenControllerDeniesAccess() {
		UserEntity user = saveUser();

		MvcTestResult result = getWithToken(FORBIDDEN_URI, jwtService.generateToken(user));

		assertThat(result).hasStatus(HttpStatus.FORBIDDEN);
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Brak dostępu");
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Nie masz uprawnień do wykonania tej operacji.");
		assertThat(result).bodyJson().hasPath("$.timestamp");
	}

	@Test
	void shouldReturn401ForMeWithoutToken() {
		assertUnauthorized(mvc.get().uri(ME_URI).exchange());
	}

	@Test
	void shouldReturnProfileOfTokenOwnerFromMe() {
		UserEntity user = saveUser();

		MvcTestResult result = getWithToken(ME_URI, jwtService.generateToken(user));

		assertThat(result).hasStatus(HttpStatus.OK);
		assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(user.getId().toString());
		assertThat(result).bodyJson().extractingPath("$.email").isEqualTo(EMAIL);
		assertThat(result).bodyJson().extractingPath("$.firstName").isEqualTo("Jan");
		assertThat(result).bodyJson().extractingPath("$.lastName").isEqualTo("Kowalski");
		assertThat(result).bodyJson().extractingPath("$.defaultCurrency").isEqualTo("PLN");
		assertThat(result).bodyJson().hasPath("$.createdAt");
		assertThat(result).bodyJson().doesNotHavePath("$.passwordHash");
		assertThat(result).bodyText().doesNotContain(PASSWORD);
	}

	@Test
	void shouldReturn401ForMeWhenUserFromTokenNoLongerExists() {
		UserEntity user = saveUser();
		String token = jwtService.generateToken(user);
		userRepository.delete(user);
		userRepository.flush();

		assertUnauthorized(getWithToken(ME_URI, token));
	}

	@Test
	void shouldProtectAuthPathsOtherThanRegisterAndLogin() {
		assertUnauthorized(mvc.get().uri(UNLISTED_AUTH_URI).exchange());
	}

	private UserEntity saveUser() {
		return userRepository.saveAndFlush(new UserEntity(
				EMAIL, passwordEncoder.encode(PASSWORD), "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
	}

	private MvcTestResult getWithToken(String uri, String token) {
		return mvc.get().uri(uri)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.exchange();
	}

	private static String responseBody(MvcTestResult result) {
		try {
			return result.getResponse().getContentAsString();
		} catch (java.io.UnsupportedEncodingException e) {
			throw new IllegalStateException(e);
		}
	}

	private static void assertUnauthorized(MvcTestResult result) {
		assertThat(result).hasStatus(HttpStatus.UNAUTHORIZED);
		assertThat(result).headers().hasValue(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
		assertThat(result).bodyJson().extractingPath("$.title").isEqualTo("Brak autoryzacji");
		assertThat(result).bodyJson().extractingPath("$.detail")
				.isEqualTo("Wymagane jest zalogowanie. Zaloguj się ponownie.");
		assertThat(result).bodyJson().hasPath("$.timestamp");
	}

	private static String otherEncodedKey() {
		byte[] key = new byte[OTHER_KEY_LENGTH_BYTES];
		Arrays.fill(key, OTHER_KEY_FILL);
		return Base64.getEncoder().encodeToString(key);
	}

	// Registered only through @Import above: @TestConfiguration keeps it out of component scanning,
	// so it never leaks into other @SpringBootTest classes.
	@TestConfiguration(proxyBeanMethods = false)
	@RestController
	@RequestMapping("/api/v1/security-probe")
	static class ProbeController {

		record PrincipalView(UUID id, String email) {

		}

		@GetMapping("/whoami")
		PrincipalView whoami(@AuthenticationPrincipal UserPrincipal principal) {
			return new PrincipalView(principal.id(), principal.email());
		}

		@GetMapping("/forbidden")
		void forbidden() {
			throw new AccessDeniedException("Denied by probe");
		}

	}

}
