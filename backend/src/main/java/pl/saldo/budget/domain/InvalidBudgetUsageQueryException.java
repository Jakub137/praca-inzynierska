package pl.saldo.budget.domain;

import java.util.List;

import pl.saldo.shared.error.ApiFieldError;

public class InvalidBudgetUsageQueryException extends RuntimeException {

	private final List<ApiFieldError> fieldErrors;

	public InvalidBudgetUsageQueryException(List<ApiFieldError> fieldErrors) {
		super("Invalid budget usage query: " + fieldErrors.stream().map(ApiFieldError::field).toList());
		this.fieldErrors = List.copyOf(fieldErrors);
	}

	public List<ApiFieldError> getFieldErrors() {
		return fieldErrors;
	}

}
