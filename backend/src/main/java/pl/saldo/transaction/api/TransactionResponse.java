package pl.saldo.transaction.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;

public record TransactionResponse(
		UUID id,
		BigDecimal amount,
		SupportedCurrency currency,
		BigDecimal exchangeRate,
		BigDecimal amountPln,
		LocalDate date,
		String description,
		TransactionType type,
		Long categoryId,
		String categoryName,
		String categoryIcon,
		boolean recurring,
		Instant createdAt) {

	public static TransactionResponse fromEntity(TransactionEntity transaction) {
		CategoryEntity category = transaction.getCategory();
		return new TransactionResponse(
				transaction.getId(),
				transaction.getAmount(),
				transaction.getCurrency(),
				transaction.getExchangeRate(),
				transaction.getAmountPln(),
				transaction.getTransactionDate(),
				transaction.getDescription(),
				transaction.getType(),
				category.getId(),
				category.getName(),
				category.getIcon(),
				transaction.isRecurring(),
				transaction.getCreatedAt());
	}

}
