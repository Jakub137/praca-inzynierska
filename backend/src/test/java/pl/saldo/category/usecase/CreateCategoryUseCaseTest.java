package pl.saldo.category.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.category.api.CategoryResponse;
import pl.saldo.category.domain.CategoryAlreadyExistsException;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.transaction.domain.TransactionType;

@ExtendWith(MockitoExtension.class)
class CreateCategoryUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Long GENERATED_ID = 12L;

	@Mock
	private CategoryRepository categoryRepository;

	private CreateCategoryUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new CreateCategoryUseCase(categoryRepository);
	}

	@Test
	void shouldSaveCategoryOwnedByGivenUserAndNotDefault() {
		CreateCategoryCommand command = new CreateCategoryCommand("Bilety", TransactionType.EXPENSE);
		given(categoryRepository.existsDuplicate(USER_ID, "Bilety", TransactionType.EXPENSE)).willReturn(false);
		given(categoryRepository.save(any(CategoryEntity.class))).willAnswer(invocation -> {
			CategoryEntity saved = invocation.getArgument(0);
			ReflectionTestUtils.setField(saved, "id", GENERATED_ID);
			return saved;
		});

		CategoryResponse result = useCase.execute(USER_ID, command);

		ArgumentCaptor<CategoryEntity> captor = ArgumentCaptor.forClass(CategoryEntity.class);
		then(categoryRepository).should().save(captor.capture());
		CategoryEntity saved = captor.getValue();
		assertThat(saved.getUserId()).isEqualTo(USER_ID);
		assertThat(saved.getName()).isEqualTo("Bilety");
		assertThat(saved.getType()).isEqualTo(TransactionType.EXPENSE);
		assertThat(saved.getIcon()).isNull();
		assertThat(saved.isDefault()).isFalse();
		assertThat(result).isEqualTo(new CategoryResponse(GENERATED_ID, "Bilety", null, TransactionType.EXPENSE, false));
	}

	@Test
	void shouldSaveTrimmedName() {
		CreateCategoryCommand command = new CreateCategoryCommand("  Bilety  ", TransactionType.EXPENSE);
		given(categoryRepository.existsDuplicate(USER_ID, "Bilety", TransactionType.EXPENSE)).willReturn(false);
		given(categoryRepository.save(any(CategoryEntity.class))).willAnswer(invocation -> invocation.getArgument(0));

		CategoryResponse result = useCase.execute(USER_ID, command);

		assertThat(result.name()).isEqualTo("Bilety");
	}

	@Test
	void shouldThrowAndNotSaveWhenCategoryNameAlreadyExists() {
		CreateCategoryCommand command = new CreateCategoryCommand("Bilety", TransactionType.EXPENSE);
		given(categoryRepository.existsDuplicate(USER_ID, "Bilety", TransactionType.EXPENSE)).willReturn(true);

		assertThatThrownBy(() -> useCase.execute(USER_ID, command))
				.isInstanceOf(CategoryAlreadyExistsException.class);

		then(categoryRepository).should(never()).save(any(CategoryEntity.class));
	}

}
