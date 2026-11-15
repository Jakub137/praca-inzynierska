package pl.saldo.auth.usecase;

import java.util.Optional;
import java.util.UUID;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.shared.security.JwtService;
import pl.saldo.user.api.UserResponse;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

@Service
public class LoginUserUseCase {

	// Internal message only: the client sees the Polish text added in T-020. Identical for every failure reason.
	private static final String INVALID_CREDENTIALS = "Invalid credentials";

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;
	private final String dummyPasswordHash;

	public LoginUserUseCase(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
		// Encoded once at startup with the same encoder (same BCrypt cost) as real hashes, so that checking a
		// password for an unknown e-mail takes as long as for a known one.
		this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
	}

	@Transactional(readOnly = true)
	public LoginResult execute(LoginUserCommand command) {
		Optional<UserEntity> found = userRepository.findByEmailIgnoreCase(command.email().trim());
		String hashToCheck = found.map(UserEntity::getPasswordHash).orElse(dummyPasswordHash);
		boolean passwordMatches = passwordEncoder.matches(command.password(), hashToCheck);
		if (found.isEmpty() || !passwordMatches) {
			throw new BadCredentialsException(INVALID_CREDENTIALS);
		}
		UserEntity user = found.get();
		return new LoginResult(jwtService.generateToken(user), jwtService.expiresInSeconds(), UserResponse.fromEntity(user));
	}

}
