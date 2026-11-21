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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import jakarta.servlet.http.HttpServletRequest;
import pl.saldo.budget.domain.BudgetCategoryNotExpenseException;
import pl.saldo.budget.domain.BudgetLimitConflictException;
import pl.saldo.budget.domain.InvalidBudgetUsageQueryException;
import pl.saldo.category.domain.CategoryAlreadyExistsException;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.goal.domain.InvalidSavingsGoalException;
import pl.saldo.recurring.domain.InvalidRecurringPaymentException;
import pl.saldo.recurring.domain.RecurringPaymentCategoryNotExpenseException;
import pl.saldo.transaction.domain.AmountPlnLimitExceededException;
import pl.saldo.transaction.domain.CategoryTypeMismatchException;
import pl.saldo.transaction.domain.InvalidTransactionQueryException;
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

	@ExceptionHandler(CategoryAlreadyExistsException.class)
	public ProblemDetail handleCategoryAlreadyExists() {
		return problem(HttpStatus.CONFLICT, ErrorMessages.CATEGORY_EXISTS);
	}

	@ExceptionHandler(ResourceNotFoundException.class)
	public ProblemDetail handleResourceNotFound() {
		return problem(HttpStatus.NOT_FOUND, ErrorMessages.forStatus(HttpStatus.NOT_FOUND.value()));
	}

	@ExceptionHandler(CategoryTypeMismatchException.class)
	public ProblemDetail handleCategoryTypeMismatch() {
		return problem(HttpStatus.BAD_REQUEST, ErrorMessages.CATEGORY_TYPE_MISMATCH);
	}

	// Same status as CategoryTypeMismatchException (400): the request is well-formed but names a wrong category type.
	@ExceptionHandler(BudgetCategoryNotExpenseException.class)
	public ProblemDetail handleBudgetCategoryNotExpense() {
		return problem(HttpStatus.BAD_REQUEST, ErrorMessages.BUDGET_CATEGORY_NOT_EXPENSE);
	}

	@ExceptionHandler(BudgetLimitConflictException.class)
	public ProblemDetail handleBudgetLimitConflict() {
		return problem(HttpStatus.CONFLICT, ErrorMessages.BUDGET_LIMIT_CONFLICT);
	}

	@ExceptionHandler(AmountPlnLimitExceededException.class)
	public ProblemDetail handleAmountPlnLimitExceeded() {
		return problem(HttpStatus.BAD_REQUEST, ErrorMessages.AMOUNT_PLN_LIMIT_EXCEEDED);
	}

	@ExceptionHandler(InvalidTransactionQueryException.class)
	public ProblemDetail handleInvalidTransactionQuery(InvalidTransactionQueryException ex) {
		ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, ErrorMessages.INVALID_QUERY);
		problem.setProperty(FIELD_ERRORS_PROPERTY, ex.getFieldErrors());
		return problem;
	}

	@ExceptionHandler(InvalidBudgetUsageQueryException.class)
	public ProblemDetail handleInvalidBudgetUsageQuery(InvalidBudgetUsageQueryException ex) {
		ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, ErrorMessages.INVALID_QUERY);
		problem.setProperty(FIELD_ERRORS_PROPERTY, ex.getFieldErrors());
		return problem;
	}

	@ExceptionHandler(InvalidSavingsGoalException.class)
	public ProblemDetail handleInvalidSavingsGoal(InvalidSavingsGoalException ex) {
		ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, ErrorMessages.VALIDATION);
		problem.setProperty(FIELD_ERRORS_PROPERTY, ex.getFieldErrors());
		return problem;
	}

	@ExceptionHandler(InvalidRecurringPaymentException.class)
	public ProblemDetail handleInvalidRecurringPayment(InvalidRecurringPaymentException ex) {
		ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, ErrorMessages.VALIDATION);
		problem.setProperty(FIELD_ERRORS_PROPERTY, ex.getFieldErrors());
		return problem;
	}

	// Same status as BudgetCategoryNotExpenseException (400): the request is well-formed but names a wrong category type.
	@ExceptionHandler(RecurringPaymentCategoryNotExpenseException.class)
	public ProblemDetail handleRecurringPaymentCategoryNotExpense() {
		return problem(HttpStatus.BAD_REQUEST, ErrorMessages.RECURRING_PAYMENT_CATEGORY_NOT_EXPENSE);
	}

	@ExceptionHandler(ExchangeRateUnavailableException.class)
	public ProblemDetail handleExchangeRateUnavailable() {
		return problem(HttpStatus.SERVICE_UNAVAILABLE, ErrorMessages.EXCHANGE_RATE_UNAVAILABLE);
	}

	@ExceptionHandler(BadCredentialsException.class)
	public ProblemDetail handleBadCredentials() {
		return problem(HttpStatus.UNAUTHORIZED, ErrorMessages.INVALID_CREDENTIALS);
	}

	@ExceptionHandler(AuthenticationException.class)
	public ProblemDetail handleAuthentication() {
		return problem(HttpStatus.UNAUTHORIZED, ErrorMessages.UNAUTHORIZED);
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ProblemDetail handleAccessDenied() {
		return problem(HttpStatus.FORBIDDEN, ErrorMessages.FORBIDDEN);
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
