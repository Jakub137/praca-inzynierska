package pl.saldo.shared.security;

import org.springframework.http.HttpHeaders;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.servlet.HandlerExceptionResolver;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class RestSecurityExceptionHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

	private static final String BEARER_CHALLENGE = "Bearer";

	private final HandlerExceptionResolver exceptionResolver;

	public RestSecurityExceptionHandler(HandlerExceptionResolver exceptionResolver) {
		this.exceptionResolver = exceptionResolver;
	}

	@Override
	public void commence(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException exception) {
		response.setHeader(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE);
		exceptionResolver.resolveException(request, response, null, exception);
	}

	@Override
	public void handle(HttpServletRequest request, HttpServletResponse response,
			AccessDeniedException exception) {
		exceptionResolver.resolveException(request, response, null, exception);
	}

}
