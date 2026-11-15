package pl.saldo.auth.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.AdditionalAnswers.returnsFirstArg;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.user.api.UserResponse;
import pl.saldo.user.domain.UserAlreadyExistsException;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@ExtendWith(MockitoExtension.class)
class RegisterUserUseCaseTest {

	private static final Instant NOW = Instant.parse("2026-11-14T10:15:30Z");
	private static final String EMAIL = "jan.kowalski@example.com";
	private static final String RAW_PASSWORD = "Secret#123";
	private static final String PASSWORD_HASH = "hashed-secret";

	@Mock
	private UserRepository userRepository;

	@Mock
	private PasswordEncoder passwordEncoder;

	private RegisterUserUseCase useCase;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
		useCase = new RegisterUserUseCase(userRepository, passwordEncoder, clock);
	}

	@Test
	void shouldRegisterUserWithDefaultCurrencyAndCreationTimeFromClock() {
		given(passwordEncoder.encode(RAW_PASSWORD)).willReturn(PASSWORD_HASH);
		given(userRepository.saveAndFlush(any(UserEntity.class))).willAnswer(returnsFirstArg());

		UserResponse response = useCase.execute(command(EMAIL));

		assertThat(response.email()).isEqualTo(EMAIL);
		assertThat(response.firstName()).isEqualTo("Jan");
		assertThat(response.lastName()).isEqualTo("Kowalski");
		assertThat(response.defaultCurrency()).isEqualTo(SupportedCurrency.PLN);
		assertThat(response.createdAt()).isEqualTo(NOW);
	}

	@Test
	void shouldSaveEncodedPasswordInsteadOfRawOne() {
		given(passwordEncoder.encode(RAW_PASSWORD)).willReturn(PASSWORD_HASH);
		given(userRepository.saveAndFlush(any(UserEntity.class))).willAnswer(returnsFirstArg());

		useCase.execute(command(EMAIL));

		ArgumentCaptor<UserEntity> saved = ArgumentCaptor.forClass(UserEntity.class);
		then(userRepository).should().saveAndFlush(saved.capture());
		assertThat(saved.getValue().getPasswordHash()).isEqualTo(PASSWORD_HASH).isNotEqualTo(RAW_PASSWORD);
	}

	@Test
	void shouldTrimEmailBeforeSaving() {
		given(passwordEncoder.encode(RAW_PASSWORD)).willReturn(PASSWORD_HASH);
		given(userRepository.saveAndFlush(any(UserEntity.class))).willAnswer(returnsFirstArg());

		useCase.execute(command("  " + EMAIL + "  "));

		ArgumentCaptor<UserEntity> saved = ArgumentCaptor.forClass(UserEntity.class);
		then(userRepository).should().saveAndFlush(saved.capture());
		assertThat(saved.getValue().getEmail()).isEqualTo(EMAIL);
	}

	@Test
	void shouldRejectDuplicateEmailWithoutEncodingPasswordOrSaving() {
		given(userRepository.existsByEmailIgnoreCase(EMAIL)).willReturn(true);

		assertThatThrownBy(() -> useCase.execute(command(EMAIL)))
				.isInstanceOf(UserAlreadyExistsException.class);

		then(passwordEncoder).shouldHaveNoInteractions();
		then(userRepository).should(org.mockito.Mockito.never()).saveAndFlush(any(UserEntity.class));
	}

	@Test
	void shouldCheckDuplicateOnTrimmedEmail() {
		given(userRepository.existsByEmailIgnoreCase("JAN.KOWALSKI@Example.COM")).willReturn(true);

		assertThatThrownBy(() -> useCase.execute(command("  JAN.KOWALSKI@Example.COM  ")))
				.isInstanceOf(UserAlreadyExistsException.class);
	}

	@Test
	void shouldTranslateUniqueIndexViolationToUserAlreadyExists() {
		given(passwordEncoder.encode(RAW_PASSWORD)).willReturn(PASSWORD_HASH);
		willThrow(new DataIntegrityViolationException("idx_users_email_upper"))
				.given(userRepository).saveAndFlush(any(UserEntity.class));

		assertThatThrownBy(() -> useCase.execute(command(EMAIL)))
				.isInstanceOf(UserAlreadyExistsException.class)
				.hasCauseInstanceOf(DataIntegrityViolationException.class);
	}

	private static RegisterUserCommand command(String email) {
		return new RegisterUserCommand("Jan", "Kowalski", email, RAW_PASSWORD);
	}

}
