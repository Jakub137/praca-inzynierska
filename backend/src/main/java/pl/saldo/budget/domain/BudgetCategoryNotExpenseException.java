package pl.saldo.budget.domain;

public class BudgetCategoryNotExpenseException extends RuntimeException {

	public BudgetCategoryNotExpenseException() {
		super("Budget limit can only be set for an EXPENSE category");
	}

}
