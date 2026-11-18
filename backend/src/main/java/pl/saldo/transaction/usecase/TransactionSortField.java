package pl.saldo.transaction.usecase;

import java.util.Arrays;
import java.util.Optional;

// Only these attributes can ever reach the ORDER BY clause; the API never passes a client-supplied property name on.
public enum TransactionSortField {

	DATE("date", "transactionDate"),
	AMOUNT_PLN("amountPln", "amountPln"),
	CREATED_AT("createdAt", "createdAt");

	private final String parameterValue;
	private final String property;

	TransactionSortField(String parameterValue, String property) {
		this.parameterValue = parameterValue;
		this.property = property;
	}

	public String parameterValue() {
		return parameterValue;
	}

	public String property() {
		return property;
	}

	public static Optional<TransactionSortField> fromParameter(String value) {
		return Arrays.stream(values())
				.filter(field -> field.parameterValue.equals(value))
				.findFirst();
	}

}
