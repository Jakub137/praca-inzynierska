package pl.saldo.analytics.domain;

import java.util.List;

import pl.saldo.shared.error.ApiFieldError;

public class InvalidAnalyticsQueryException extends RuntimeException {

	private final List<ApiFieldError> fieldErrors;

	public InvalidAnalyticsQueryException(List<ApiFieldError> fieldErrors) {
		super("Invalid analytics query: " + fieldErrors.stream().map(ApiFieldError::field).toList());
		this.fieldErrors = List.copyOf(fieldErrors);
	}

	public List<ApiFieldError> getFieldErrors() {
		return fieldErrors;
	}

}
