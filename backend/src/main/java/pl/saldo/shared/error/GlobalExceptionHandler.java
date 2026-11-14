package pl.saldo.shared.error;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import jakarta.servlet.http.HttpServletRequest;
import pl.saldo.user.domain.UserAlreadyExistsException;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	private static final String TIMESTAMP_PROPERTY = "timestamp";
	private static final String FIELD_ERRORS_PROPERTY = "fieldErrors";

	private final Clock clock;

	public GlobalExceptionHandler(Clock clock) {
		this.clock = clock;
	}

	// Overrides the inherited handler instead of adding @ExceptionHandler: a second mapping for the same exception
	// type would make the application fail at startup. Only field and message are exposed, never the rejected value
	// (it may be a password).
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		ProblemDetail problem = problem(status, ErrorMessages.VALIDATION);
		problem.setProperty(FIELD_ERRORS_PROPERTY, toFieldErrors(ex));
		return handleExceptionInternal(ex, problem, headers, status, request);
	}

	// Every inherited handler (malformed JSON, 405, 406, 415, 404...) ends here. Some pass a null body, others
	// (e.g. malformed JSON) an English ProblemDetail ("Failed to read request"). Anything not built by problem(...)
	// is replaced with the Polish text for the status; our own bodies (with timestamp) are passed through.
	@Override
	protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
			HttpStatusCode statusCode, WebRequest request) {
		Object responseBody = isOwnProblem(body) ? body : problem(statusCode, ErrorMessages.forStatus(statusCode.value()));
		return super.handleExceptionInternal(ex, responseBody, headers, statusCode, request);
	}

	private static boolean isOwnProblem(Object body) {
		return body instanceof ProblemDetail problem
				&& problem.getProperties() != null
				&& problem.getProperties().containsKey(TIMESTAMP_PROPERTY);
	}

	@ExceptionHandler(UserAlreadyExistsException.class)
	public ProblemDetail handleUserAlreadyExists() {
		return problem(HttpStatus.CONFLICT, ErrorMessages.EMAIL_TAKEN);
	}

	// Logs the exception and the request line only: never the request body, query string or headers.
	@ExceptionHandler(Exception.class)
	public ProblemDetail handleUnexpected(Exception ex, HttpServletRequest request) {
		log.error("Unhandled exception for {} {}", request.getMethod(), request.getRequestURI(), ex);
		return problem(HttpStatus.INTERNAL_SERVER_ERROR, ErrorMessages.INTERNAL);
	}

	private ProblemDetail problem(HttpStatusCode status, ErrorMessages.Text text) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, text.detail());
		problem.setTitle(text.title());
		problem.setProperty(TIMESTAMP_PROPERTY, Instant.now(clock));
		return problem;
	}

	private List<ApiFieldError> toFieldErrors(MethodArgumentNotValidException ex) {
		return ex.getBindingResult().getFieldErrors().stream()
				.map(error -> new ApiFieldError(error.getField(), error.getDefaultMessage()))
				.sorted(Comparator.comparing(ApiFieldError::field).thenComparing(ApiFieldError::message))
				.toList();
	}

}
