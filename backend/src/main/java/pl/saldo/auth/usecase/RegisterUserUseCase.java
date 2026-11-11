package pl.saldo.auth.usecase;

import java.time.Clock;
import java.time.Instant;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.user.api.UserResponse;
import pl.saldo.user.domain.UserAlreadyExistsException;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@Service
public class RegisterUserUseCase {

	private static final SupportedCurrency DEFAULT_CURRENCY = SupportedCurrency.PLN;

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final Clock clock;

	public RegisterUserUseCase(UserRepository userRepository, PasswordEncoder passwordEncoder, Clock clock) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.clock = clock;
	}

	@Transactional
	public UserResponse execute(RegisterUserCommand command) {
		String email = command.email().trim();
		if (userRepository.existsByEmailIgnoreCase(email)) {
			throw new UserAlreadyExistsException();
		}
		UserEntity user = new UserEntity(
				email,
				passwordEncoder.encode(command.password()),
				command.firstName(),
				command.lastName(),
				DEFAULT_CURRENCY,
				Instant.now(clock));
		return UserResponse.fromEntity(save(user));
	}

	// The only unique index on users is idx_users_email_upper, so a violation means a concurrent duplicate.
	private UserEntity save(UserEntity user) {
		try {
			return userRepository.saveAndFlush(user);
		} catch (DataIntegrityViolationException e) {
			throw new UserAlreadyExistsException(e);
		}
	}

}
