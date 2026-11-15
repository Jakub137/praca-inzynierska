package pl.saldo.shared.security;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import pl.saldo.user.infrastructure.UserRepository;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private static final String BEARER_PREFIX = "Bearer ";

	private final JwtService jwtService;
	private final UserRepository userRepository;
	private final AuthenticationEntryPoint authenticationEntryPoint;

	public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository,
			AuthenticationEntryPoint authenticationEntryPoint) {
		this.jwtService = jwtService;
		this.userRepository = userRepository;
		this.authenticationEntryPoint = authenticationEntryPoint;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		Optional<String> token = extractBearerToken(request);
		if (token.isEmpty()) {
			filterChain.doFilter(request, response);
			return;
		}
		Optional<UserPrincipal> principal = authenticate(token.get());
		if (principal.isEmpty()) {
			SecurityContextHolder.clearContext();
			authenticationEntryPoint.commence(request, response, new BadCredentialsException("Invalid JWT"));
			return;
		}
		SecurityContextHolder.setContext(contextFor(principal.get()));
		filterChain.doFilter(request, response);
	}

	private Optional<String> extractBearerToken(HttpServletRequest request) {
		String header = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (header == null || !header.regionMatches(true, 0, BEARER_PREFIX, 0, BEARER_PREFIX.length())) {
			return Optional.empty();
		}
		String token = header.substring(BEARER_PREFIX.length()).trim();
		return token.isEmpty() ? Optional.empty() : Optional.of(token);
	}

	// The token is never logged. Any parsing failure (signature, expiry, malformed id) means "not authenticated".
	private Optional<UserPrincipal> authenticate(String token) {
		try {
			UUID userId = jwtService.extractUserId(token);
			return userRepository.findById(userId)
					.map(UserPrincipal::fromEntity)
					.filter(principal -> jwtService.isTokenValid(token, principal));
		} catch (JwtException | IllegalArgumentException e) {
			return Optional.empty();
		}
	}

	private SecurityContext contextFor(UserPrincipal principal) {
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(
				UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities()));
		return context;
	}

}
