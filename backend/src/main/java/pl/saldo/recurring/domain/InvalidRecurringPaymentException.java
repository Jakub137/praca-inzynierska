package pl.saldo.recurring.domain;

import java.util.List;

import pl.saldo.shared.error.ApiFieldError;

public class InvalidRecurringPaymentException extends RuntimeException {

	private final List<ApiFieldError> fieldErrors;

	public InvalidRecurringPaymentException(List<ApiFieldError> fieldErrors) {
		super("Invalid recurring payment: " + fieldErrors.stream().map(ApiFieldError::field).toList());
		this.fieldErrors = List.copyOf(fieldErrors);
	}

	public List<ApiFieldError> getFieldErrors() {
		return fieldErrors;
	}

}
