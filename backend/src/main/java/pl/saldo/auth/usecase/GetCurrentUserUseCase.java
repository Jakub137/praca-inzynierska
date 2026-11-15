package pl.saldo.auth.usecase;

import java.util.UUID;

import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.user.api.UserResponse;
import pl.saldo.user.infrastructure.UserRepository;

@Service
public class GetCurrentUserUseCase {

	// Internal message only: the client sees the generic Polish 401 text from GlobalExceptionHandler.
	private static final String USER_NOT_FOUND = "Authenticated user no longer exists";

	private final UserRepository userRepository;

	public GetCurrentUserUseCase(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Transactional(readOnly = true)
	public UserResponse execute(UUID userId) {
		return userRepository.findById(userId)
				.map(UserResponse::fromEntity)
				.orElseThrow(() -> new InsufficientAuthenticationException(USER_NOT_FOUND));
	}

}
