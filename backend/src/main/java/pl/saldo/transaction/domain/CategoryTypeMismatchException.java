package pl.saldo.transaction.domain;

public class CategoryTypeMismatchException extends RuntimeException {

	public CategoryTypeMismatchException() {
		super("Category type does not match transaction type");
	}

}
