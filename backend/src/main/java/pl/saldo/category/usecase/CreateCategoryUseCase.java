package pl.saldo.category.usecase;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.category.api.CategoryResponse;
import pl.saldo.category.domain.CategoryAlreadyExistsException;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;

@Service
public class CreateCategoryUseCase {

	private final CategoryRepository categoryRepository;

	public CreateCategoryUseCase(CategoryRepository categoryRepository) {
		this.categoryRepository = categoryRepository;
	}

	// Two concurrent requests from the same user can both pass the check: categories has no UNIQUE (user_id, name)
	// by design (T-030), so the duplicate rule lives here only.
	@Transactional
	public CategoryResponse execute(UUID userId, CreateCategoryCommand command) {
		if (categoryRepository.existsDuplicate(userId, command.name(), command.type())) {
			throw new CategoryAlreadyExistsException();
		}
		CategoryEntity category = new CategoryEntity(userId, command.name(), null, command.type());
		return CategoryResponse.fromEntity(categoryRepository.save(category));
	}

}
