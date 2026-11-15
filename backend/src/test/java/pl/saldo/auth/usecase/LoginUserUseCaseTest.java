package pl.saldo.auth.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.security.JwtProperties;
import pl.saldo.shared.security.JwtService;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@ExtendWith(MockitoExtension.class)
class LoginUserUseCaseTest {

	private static final Instant NOW = Instant.parse("2026-11-15T10:00:00Z");
	private static final Duration EXPIRATION = Duration.ofHours(24);
	private static final byte KEY_FILL = 7;
	private static final int KEY_LENGTH_BYTES = 48;
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final String EMAIL = "Jan.Kowalski@Example.com";
	private static final String PASSWORD = "Secret#123";
	private static final String USER_HASH = "stored-user-hash";
	private static final String DUMMY_HASH = "dummy-hash";

	@Mock
	private UserRepository userRepository;

	@Mock
	private PasswordEncoder passwordEncoder;

	private LoginUserUseCase useCase;
	private JwtService jwtService;
	private UserEntity user;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
		jwtService = new JwtService(new JwtProperties(encodedKey(), EXPIRATION), clock);
		given(passwordEncoder.encode(anyString())).willReturn(DUMMY_HASH);
		useCase = new LoginUserUseCase(userRepository, passwordEncoder, jwtService);
		user = new UserEntity(EMAIL, USER_HASH, "Jan", "Kowalski", SupportedCurrency.PLN, NOW);
		ReflectionTestUtils.setField(user, "id", USER_ID);
	}

	@Test
	void shouldReturnTokenAndExpiryInSecondsForValidCredentials() {
		given(userRepository.findByEmailIgnoreCase(EMAIL)).willReturn(Optional.of(user));
		given(passwordEncoder.matches(PASSWORD, USER_HASH)).willReturn(true);

		LoginResult result = useCase.execute(new LoginUserCommand(EMAIL, PASSWORD));

		assertThat(result.expiresIn()).isEqualTo(86400L);
		assertThat(jwtService.extractUserId(result.accessToken())).isEqualTo(USER_ID);
		assertThat(result.user().id()).isEqualTo(USER_ID);
		assertThat(result.user().email()).isEqualTo(EMAIL);
		then(passwordEncoder).should().matches(PASSWORD, USER_HASH);
	}

	@Test
	void shouldLogInWhenEmailHasDifferentCaseAndSurroundingSpaces() {
		given(userRepository.findByEmailIgnoreCase(EMAIL)).willReturn(Optional.of(user));
		given(passwordEncoder.matches(PASSWORD, USER_HASH)).willReturn(true);

		LoginResult result = useCase.execute(new LoginUserCommand("  " + EMAIL + "  ", PASSWORD));

		assertThat(result.user().id()).isEqualTo(USER_ID);
		then(userRepository).should().findByEmailIgnoreCase(EMAIL);
	}

	@Test
	void shouldCheckPasswordAgainstDummyHashWhenEmailIsUnknown() {
		given(userRepository.findByEmailIgnoreCase(EMAIL)).willReturn(Optional.empty());

		Throwable thrown = catchThrowable(() -> useCase.execute(new LoginUserCommand(EMAIL, PASSWORD)));

		assertThat(thrown).isInstanceOf(BadCredentialsException.class);
		then(passwordEncoder).should().matches(PASSWORD, DUMMY_HASH);
	}

	@Test
	void shouldThrowIdenticalExceptionForUnknownEmailAndWrongPassword() {
		given(userRepository.findByEmailIgnoreCase(EMAIL)).willReturn(Optional.empty());
		Throwable unknownEmail = catchThrowable(() -> useCase.execute(new LoginUserCommand(EMAIL, PASSWORD)));

		given(userRepository.findByEmailIgnoreCase(EMAIL)).willReturn(Optional.of(user));
		given(passwordEncoder.matches(PASSWORD, USER_HASH)).willReturn(false);
		Throwable wrongPassword = catchThrowable(() -> useCase.execute(new LoginUserCommand(EMAIL, PASSWORD)));

		assertThat(unknownEmail).isInstanceOf(BadCredentialsException.class);
		assertThat(wrongPassword).isInstanceOf(BadCredentialsException.class);
		assertThat(wrongPassword.getMessage()).isEqualTo(unknownEmail.getMessage());
	}

	private static String encodedKey() {
		byte[] key = new byte[KEY_LENGTH_BYTES];
		Arrays.fill(key, KEY_FILL);
		return Base64.getEncoder().encodeToString(key);
	}

}
