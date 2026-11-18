package pl.saldo.transaction.usecase;

import java.util.UUID;

import org.springframework.stereotype.Component;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.domain.CategoryTypeMismatchException;
import pl.saldo.transaction.domain.TransactionType;

@Component
public class TransactionCategoryResolver {

	private final CategoryRepository categoryRepository;

	public TransactionCategoryResolver(CategoryRepository categoryRepository) {
		this.categoryRepository = categoryRepository;
	}

	// A missing and a foreign category are indistinguishable for the caller (404), so ids of other users never leak.
	public CategoryEntity resolve(UUID userId, Long categoryId, TransactionType type) {
		CategoryEntity category = categoryRepository.findAccessibleById(categoryId, userId)
				.orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));
		if (category.getType() != type) {
			throw new CategoryTypeMismatchException();
		}
		return category;
	}

}
