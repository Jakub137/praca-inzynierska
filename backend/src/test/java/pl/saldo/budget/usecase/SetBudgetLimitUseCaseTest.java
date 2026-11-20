package pl.saldo.budget.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.budget.api.BudgetLimitResponse;
import pl.saldo.budget.domain.BudgetCategoryNotExpenseException;
import pl.saldo.budget.domain.BudgetLimitConflictException;
import pl.saldo.budget.domain.BudgetLimitEntity;
import pl.saldo.budget.infrastructure.BudgetLimitRepository;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.domain.TransactionType;

@ExtendWith(MockitoExtension.class)
class SetBudgetLimitUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Long CATEGORY_ID = 5L;
	private static final Long GENERATED_ID = 42L;
	private static final int MONTH = 11;
	private static final int YEAR = 2026;
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");

	@Mock
	private BudgetLimitRepository budgetLimitRepository;

	@Mock
	private CategoryRepository categoryRepository;

	private SetBudgetLimitUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new SetBudgetLimitUseCase(budgetLimitRepository, categoryRepository, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	@Test
	void shouldCreateLimitWhenNoneExistsForKey() {
		givenCategory(TransactionType.EXPENSE);
		given(budgetLimitRepository.findByUserIdAndYearAndMonthAndCategoryId(USER_ID, YEAR, MONTH, CATEGORY_ID))
				.willReturn(Optional.empty());
		given(budgetLimitRepository.saveAndFlush(any(BudgetLimitEntity.class))).willAnswer(invocation -> {
			BudgetLimitEntity saved = invocation.getArgument(0);
			ReflectionTestUtils.setField(saved, "id", GENERATED_ID);
			return saved;
		});

		SetBudgetLimitResult result = useCase.execute(USER_ID, command(new BigDecimal("1500")));

		ArgumentCaptor<BudgetLimitEntity> captor = ArgumentCaptor.forClass(BudgetLimitEntity.class);
		then(budgetLimitRepository).should().saveAndFlush(captor.capture());
		BudgetLimitEntity saved = captor.getValue();
		assertThat(saved.getUserId()).isEqualTo(USER_ID);
		assertThat(saved.getCategoryId()).isEqualTo(CATEGORY_ID);
		assertThat(saved.getMonth()).isEqualTo(MONTH);
		assertThat(saved.getYear()).isEqualTo(YEAR);
		assertThat(saved.getLimitAmount()).isEqualTo(new BigDecimal("1500.00"));
		assertThat(saved.getCreatedAt()).isEqualTo(NOW);
		assertThat(result.created()).isTrue();
		assertThat(result.limit())
				.isEqualTo(new BudgetLimitResponse(GENERATED_ID, CATEGORY_ID, MONTH, YEAR, new BigDecimal("1500.00")));
	}

	@Test
	void shouldUpdateAmountOfExistingLimitWithoutSavingAgain() {
		givenCategory(TransactionType.EXPENSE);
		BudgetLimitEntity existing = existingLimit(new BigDecimal("1000.00"));
		given(budgetLimitRepository.findByUserIdAndYearAndMonthAndCategoryId(USER_ID, YEAR, MONTH, CATEGORY_ID))
				.willReturn(Optional.of(existing));

		SetBudgetLimitResult result = useCase.execute(USER_ID, command(new BigDecimal("1800.50")));

		assertThat(existing.getLimitAmount()).isEqualTo(new BigDecimal("1800.50"));
		assertThat(existing.getCreatedAt()).isEqualTo(NOW.minusSeconds(3600));
		assertThat(result.created()).isFalse();
		assertThat(result.limit())
				.isEqualTo(new BudgetLimitResponse(GENERATED_ID, CATEGORY_ID, MONTH, YEAR, new BigDecimal("1800.50")));
		then(budgetLimitRepository).should(never()).saveAndFlush(any(BudgetLimitEntity.class));
		then(budgetLimitRepository).should(never()).save(any(BudgetLimitEntity.class));
	}

	@Test
	void shouldThrowNotFoundAndTouchNoLimitWhenCategoryIsMissingOrForeign() {
		given(categoryRepository.findAccessibleById(CATEGORY_ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> useCase.execute(USER_ID, command(new BigDecimal("1500.00"))))
				.isInstanceOf(ResourceNotFoundException.class);

		then(budgetLimitRepository).shouldHaveNoInteractions();
	}

	@Test
	void shouldThrowAndTouchNoLimitWhenCategoryIsIncome() {
		givenCategory(TransactionType.INCOME);

		assertThatThrownBy(() -> useCase.execute(USER_ID, command(new BigDecimal("1500.00"))))
				.isInstanceOf(BudgetCategoryNotExpenseException.class);

		then(budgetLimitRepository).shouldHaveNoInteractions();
	}

	@Test
	void shouldThrowConflictWhenFlushViolatesDatabaseConstraint() {
		givenCategory(TransactionType.EXPENSE);
		given(budgetLimitRepository.findByUserIdAndYearAndMonthAndCategoryId(USER_ID, YEAR, MONTH, CATEGORY_ID))
				.willReturn(Optional.empty());
		given(budgetLimitRepository.saveAndFlush(any(BudgetLimitEntity.class)))
				.willThrow(new DataIntegrityViolationException("uq_budget_limits_user_year_month_category"));

		assertThatThrownBy(() -> useCase.execute(USER_ID, command(new BigDecimal("1500.00"))))
				.isInstanceOf(BudgetLimitConflictException.class)
				.hasCauseInstanceOf(DataIntegrityViolationException.class);
	}

	private void givenCategory(TransactionType type) {
		CategoryEntity category = new CategoryEntity(USER_ID, "Testowa", null, type);
		ReflectionTestUtils.setField(category, "id", CATEGORY_ID);
		given(categoryRepository.findAccessibleById(CATEGORY_ID, USER_ID)).willReturn(Optional.of(category));
	}

	private BudgetLimitEntity existingLimit(BigDecimal amount) {
		BudgetLimitEntity limit = new BudgetLimitEntity(
				USER_ID, CATEGORY_ID, MONTH, YEAR, amount, NOW.minusSeconds(3600));
		ReflectionTestUtils.setField(limit, "id", GENERATED_ID);
		return limit;
	}

	private SetBudgetLimitCommand command(BigDecimal amount) {
		return new SetBudgetLimitCommand(CATEGORY_ID, MONTH, YEAR, amount);
	}

}
