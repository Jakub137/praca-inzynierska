package pl.saldo.auth.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.BDDMockito.given;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.user.api.UserResponse;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@ExtendWith(MockitoExtension.class)
class GetCurrentUserUseCaseTest {

	private static final Instant NOW = Instant.parse("2026-11-15T10:00:00Z");
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final String EMAIL = "jan.kowalski@example.com";

	@Mock
	private UserRepository userRepository;

	@Test
	void shouldReturnProfileOfExistingUser() {
		UserEntity user = new UserEntity(EMAIL, "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN, NOW);
		ReflectionTestUtils.setField(user, "id", USER_ID);
		given(userRepository.findById(USER_ID)).willReturn(Optional.of(user));

		UserResponse result = new GetCurrentUserUseCase(userRepository).execute(USER_ID);

		assertThat(result).isEqualTo(new UserResponse(USER_ID, EMAIL, "Jan", "Kowalski", SupportedCurrency.PLN, NOW));
	}

	@Test
	void shouldThrowInsufficientAuthenticationWhenUserNoLongerExists() {
		given(userRepository.findById(USER_ID)).willReturn(Optional.empty());

		Throwable thrown = catchThrowable(() -> new GetCurrentUserUseCase(userRepository).execute(USER_ID));

		assertThat(thrown).isExactlyInstanceOf(InsufficientAuthenticationException.class);
	}

}
