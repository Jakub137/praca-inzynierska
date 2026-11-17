package pl.saldo.category.domain;

public class CategoryAlreadyExistsException extends RuntimeException {

	public CategoryAlreadyExistsException() {
		super("Category with the given name and type already exists");
	}

}
