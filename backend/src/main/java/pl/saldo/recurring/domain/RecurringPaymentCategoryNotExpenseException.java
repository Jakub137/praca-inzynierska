package pl.saldo.recurring.domain;

public class RecurringPaymentCategoryNotExpenseException extends RuntimeException {

	public RecurringPaymentCategoryNotExpenseException() {
		super("A recurring payment can only be assigned to an EXPENSE category");
	}

}
