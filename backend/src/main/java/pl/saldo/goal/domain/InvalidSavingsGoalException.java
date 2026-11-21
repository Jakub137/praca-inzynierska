package pl.saldo.goal.domain;

import java.util.List;

import pl.saldo.shared.error.ApiFieldError;

public class InvalidSavingsGoalException extends RuntimeException {

	private final List<ApiFieldError> fieldErrors;

	public InvalidSavingsGoalException(List<ApiFieldError> fieldErrors) {
		super("Invalid savings goal: " + fieldErrors.stream().map(ApiFieldError::field).toList());
		this.fieldErrors = List.copyOf(fieldErrors);
	}

	public List<ApiFieldError> getFieldErrors() {
		return fieldErrors;
	}

}
