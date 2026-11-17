package pl.saldo.category.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.category.api.CategoryResponse;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.transaction.domain.TransactionType;

@ExtendWith(MockitoExtension.class)
class GetCategoriesUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
		private static final Sort EXPECTED_ORDER = Sort.by(CategoryEntity::getType, CategoryEntity::getName, CategoryEntity::getId);

	@Mock
	private CategoryRepository categoryRepository;

	// The stub matches only the exact Sort, so the test also proves the use case asks the database for this order.
	@Test
	void shouldMapCategoriesInTheOrderReturnedByRepository() {
		CategoryEntity system = category(1L, null, "Transport", "car", TransactionType.EXPENSE, true);
		CategoryEntity own = category(12L, USER_ID, "Bilety", null, TransactionType.EXPENSE, false);
		given(categoryRepository.findAllByUserIdOrIsDefaultTrue(USER_ID, EXPECTED_ORDER))
				.willReturn(List.of(system, own));

		List<CategoryResponse> result = new GetCategoriesUseCase(categoryRepository).execute(USER_ID);

		assertThat(result).containsExactly(
				new CategoryResponse(1L, "Transport", "car", TransactionType.EXPENSE, true),
				new CategoryResponse(12L, "Bilety", null, TransactionType.EXPENSE, false));
	}

	@Test
	void shouldReturnEmptyListWhenRepositoryFindsNothing() {
		given(categoryRepository.findAllByUserIdOrIsDefaultTrue(USER_ID, EXPECTED_ORDER)).willReturn(List.of());

		List<CategoryResponse> result = new GetCategoriesUseCase(categoryRepository).execute(USER_ID);

		assertThat(result).isEmpty();
	}

	private static CategoryEntity category(
			Long id, UUID userId, String name, String icon, TransactionType type, boolean isDefault) {
		CategoryEntity entity = new CategoryEntity(userId, name, icon, type);
		ReflectionTestUtils.setField(entity, "id", id);
		ReflectionTestUtils.setField(entity, "isDefault", isDefault);
		return entity;
	}

}
