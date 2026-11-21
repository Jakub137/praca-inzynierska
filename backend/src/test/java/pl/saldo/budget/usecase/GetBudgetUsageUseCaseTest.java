package pl.saldo.budget.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import pl.saldo.budget.api.BudgetUsageResponse;
import pl.saldo.budget.domain.BudgetStatus;
import pl.saldo.budget.domain.InvalidBudgetUsageQueryException;
import pl.saldo.budget.infrastructure.BudgetLimitRepository;
import pl.saldo.budget.infrastructure.BudgetLimitRow;
import pl.saldo.transaction.infrastructure.CategorySpending;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class GetBudgetUsageUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Clock NOVEMBER_CLOCK = Clock.fixed(Instant.parse("2026-11-20T10:00:00Z"), ZoneOffset.UTC);
	private static final Clock MONTH_END_CLOCK = Clock.fixed(Instant.parse("2026-11-30T23:30:00Z"), ZoneOffset.UTC);

	@Mock
	private BudgetLimitRepository budgetLimitRepository;

	@Mock
	private TransactionRepository transactionRepository;

	private GetBudgetUsageUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = useCase(NOVEMBER_CLOCK);
	}

	@Test
	void shouldCombineLimitsWithSpendingAndExposeAmountsWithTwoDecimals() {
		given(budgetLimitRepository.findUsageRows(USER_ID, 2026, 11)).willReturn(List.of(
				new BudgetLimitRow(1L, "Jedzenie", new BigDecimal("1500")),
				new BudgetLimitRow(2L, "Transport", new BigDecimal("200.00")),
				new BudgetLimitRow(3L, "Rozrywka", new BigDecimal("100.00"))));
		given(transactionRepository.sumExpensesByCategory(
				USER_ID, List.of(1L, 2L, 3L), LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1)))
				.willReturn(List.of(
						new CategorySpending(1L, new BigDecimal("1140")),
						new CategorySpending(3L, new BigDecimal("184.20"))));

		List<BudgetUsageResponse> result = useCase.execute(USER_ID, new GetBudgetUsageQuery(11, 2026));

		assertThat(result).containsExactly(
				new BudgetUsageResponse(1L, "Jedzenie", new BigDecimal("1500.00"), new BigDecimal("1140.00"),
						new BigDecimal("76.00"), BudgetStatus.NORMAL),
				new BudgetUsageResponse(2L, "Transport", new BigDecimal("200.00"), new BigDecimal("0.00"),
						new BigDecimal("0.00"), BudgetStatus.NORMAL),
				new BudgetUsageResponse(3L, "Rozrywka", new BigDecimal("100.00"), new BigDecimal("184.20"),
						new BigDecimal("184.20"), BudgetStatus.EXCEEDED));
	}

	@Test
	void shouldReturnEmptyListAndSkipSpendingQueryWhenThereAreNoLimits() {
		given(budgetLimitRepository.findUsageRows(USER_ID, 2026, 11)).willReturn(List.of());

		List<BudgetUsageResponse> result = useCase.execute(USER_ID, new GetBudgetUsageQuery(11, 2026));

		assertThat(result).isEmpty();
		then(transactionRepository).shouldHaveNoInteractions();
	}

	@Test
	void shouldQueryDecemberRangeUpToFirstDayOfNextYear() {
		given(budgetLimitRepository.findUsageRows(USER_ID, 2026, 12))
				.willReturn(List.of(new BudgetLimitRow(1L, "Jedzenie", new BigDecimal("100.00"))));
		given(transactionRepository.sumExpensesByCategory(
				USER_ID, List.of(1L), LocalDate.of(2026, 12, 1), LocalDate.of(2027, 1, 1)))
				.willReturn(List.of());

		List<BudgetUsageResponse> result = useCase.execute(USER_ID, new GetBudgetUsageQuery(12, 2026));

		assertThat(result).hasSize(1);
		assertThat(result.get(0).spentAmount()).isEqualTo(new BigDecimal("0.00"));
	}

	@Test
	void shouldUseCurrentMonthInWarsawWhenNoParametersAreGiven() {
		GetBudgetUsageUseCase monthEndUseCase = useCase(MONTH_END_CLOCK);
		given(budgetLimitRepository.findUsageRows(USER_ID, 2026, 12)).willReturn(List.of());

		monthEndUseCase.execute(USER_ID, new GetBudgetUsageQuery(null, null));

		then(budgetLimitRepository).should().findUsageRows(USER_ID, 2026, 12);
	}

	@Test
	void shouldRejectInvalidQueryBeforeAnyDatabaseCall() {
		assertThatExceptionOfType(InvalidBudgetUsageQueryException.class)
				.isThrownBy(() -> useCase.execute(USER_ID, new GetBudgetUsageQuery(13, 2026)));

		then(budgetLimitRepository).shouldHaveNoInteractions();
		then(transactionRepository).shouldHaveNoInteractions();
	}

	private GetBudgetUsageUseCase useCase(Clock clock) {
		return new GetBudgetUsageUseCase(budgetLimitRepository, transactionRepository, clock);
	}

}
