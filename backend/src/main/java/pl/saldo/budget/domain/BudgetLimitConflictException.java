package pl.saldo.budget.domain;

public class BudgetLimitConflictException extends RuntimeException {

	public BudgetLimitConflictException(Throwable cause) {
		super("Budget limit could not be inserted: concurrent change", cause);
	}

}
