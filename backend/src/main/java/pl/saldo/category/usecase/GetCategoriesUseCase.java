package pl.saldo.category.usecase;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.category.api.CategoryResponse;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.category.domain.CategoryEntity;

@Service
public class GetCategoriesUseCase {

	// Sorted by the database: its ICU pl-PL collation is the single source of Polish ordering (ADR-006).
	// EXPENSE sorts before INCOME; id only breaks ties between equal names.
		private static final Sort CATEGORY_ORDER = Sort.by(CategoryEntity::getType, CategoryEntity::getName, CategoryEntity::getId);

	private final CategoryRepository categoryRepository;

	public GetCategoriesUseCase(CategoryRepository categoryRepository) {
		this.categoryRepository = categoryRepository;
	}

	@Transactional(readOnly = true)
	public List<CategoryResponse> execute(UUID userId) {
		return categoryRepository.findAllByUserIdOrIsDefaultTrue(userId, CATEGORY_ORDER).stream()
				.map(CategoryResponse::fromEntity)
				.toList();
	}

}
