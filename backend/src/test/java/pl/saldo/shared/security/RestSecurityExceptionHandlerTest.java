package pl.saldo.shared.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.then;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.servlet.HandlerExceptionResolver;

@ExtendWith(MockitoExtension.class)
class RestSecurityExceptionHandlerTest {

	@Mock
	private HandlerExceptionResolver exceptionResolver;

	private RestSecurityExceptionHandler handler;
	private MockHttpServletRequest request;
	private MockHttpServletResponse response;

	@BeforeEach
	void setUp() {
		handler = new RestSecurityExceptionHandler(exceptionResolver);
		request = new MockHttpServletRequest();
		response = new MockHttpServletResponse();
	}

	@Test
	void commenceSetsBearerChallengeAndDelegatesAuthenticationException() {
		BadCredentialsException exception = new BadCredentialsException("Invalid JWT");

		handler.commence(request, response, exception);

		assertThat(response.getHeader(HttpHeaders.WWW_AUTHENTICATE)).isEqualTo("Bearer");
		then(exceptionResolver).should().resolveException(request, response, null, exception);
	}

	@Test
	void handleDelegatesAccessDeniedExceptionWithoutChallenge() {
		AccessDeniedException exception = new AccessDeniedException("Denied");

		handler.handle(request, response, exception);

		assertThat(response.getHeader(HttpHeaders.WWW_AUTHENTICATE)).isNull();
		then(exceptionResolver).should().resolveException(request, response, null, exception);
	}

}
