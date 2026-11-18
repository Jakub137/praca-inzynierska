package pl.saldo.transaction.domain;

import java.util.List;

import pl.saldo.shared.error.ApiFieldError;

public class InvalidTransactionQueryException extends RuntimeException {

	private final List<ApiFieldError> fieldErrors;

	public InvalidTransactionQueryException(List<ApiFieldError> fieldErrors) {
		super("Invalid transaction query: " + fieldErrors.stream().map(ApiFieldError::field).toList());
		this.fieldErrors = List.copyOf(fieldErrors);
	}

	public List<ApiFieldError> getFieldErrors() {
		return fieldErrors;
	}

}
