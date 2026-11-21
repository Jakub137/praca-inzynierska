package pl.saldo.recurring.api;

import java.math.BigDecimal;
import java.time.LocalDate;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.recurring.domain.PaymentFrequency;
import pl.saldo.recurring.domain.RecurringPaymentEntity;

public record RecurringPaymentResponse(
		Long id,
		String name,
		BigDecimal amount,
		SupportedCurrency currency,
		PaymentFrequency frequency,
		LocalDate nextDueDate,
		Long categoryId,
		String categoryName) {

	public static RecurringPaymentResponse fromEntity(RecurringPaymentEntity payment) {
		CategoryEntity category = payment.getCategory();
		return new RecurringPaymentResponse(
				payment.getId(),
				payment.getName(),
				payment.getAmount(),
				payment.getCurrency(),
				payment.getFrequency(),
				payment.getNextDueDate(),
				category.getId(),
				category.getName());
	}

}
