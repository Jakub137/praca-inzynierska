package pl.saldo.dashboard.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import pl.saldo.budget.infrastructure.BudgetLimitRepository;
import pl.saldo.dashboard.api.DashboardSummaryResponse;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;
import pl.saldo.transaction.infrastructure.TypeTotal;

@ExtendWith(MockitoExtension.class)
class GetDashboardSummaryUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Clock NOVEMBER_CLOCK = Clock.fixed(Instant.parse("2026-11-20T10:00:00Z"), ZoneOffset.UTC);
	private static final Clock MONTH_END_CLOCK = Clock.fixed(Instant.parse("2026-11-30T23:30:00Z"), ZoneOffset.UTC);
	private static final LocalDate DAY_AFTER_TODAY = LocalDate.of(2026, 11, 21);
	private static final LocalDate NOVEMBER_START = LocalDate.of(2026, 11, 1);
	private static final LocalDate DECEMBER_START = LocalDate.of(2026, 12, 1);

	@Mock
	private TransactionRepository transactionRepository;

	@Mock
	private BudgetLimitRepository budgetLimitRepository;

	private GetDashboardSummaryUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new GetDashboardSummaryUseCase(transactionRepository, budgetLimitRepository, NOVEMBER_CLOCK);
	}

	@Test
	void shouldCombineBalancesMonthTotalsAndLimitWithRoundedChange() {
		givenBalances(
				List.of(income("5000.00"), expense("1200.50")),
				List.of(income("4000.00"), expense("1000.00")));
		given(transactionRepository.sumByTypeBetween(USER_ID, NOVEMBER_START, DECEMBER_START))
				.willReturn(List.of(income("1000"), expense("200.50")));
		given(budgetLimitRepository.sumLimitAmount(USER_ID, 2026, 11)).willReturn(Optional.of(new BigDecimal("1500")));

		DashboardSummaryResponse result = useCase.execute(USER_ID);

		// Change: (3799.50 - 3000.00) * 100 / 3000.00 = 26.65, rounded HALF_UP to one decimal.
		assertThat(result).isEqualTo(new DashboardSummaryResponse(
				"2026-11", new BigDecimal("3799.50"), new BigDecimal("26.7"), new BigDecimal("200.50"),
				new BigDecimal("1000.00"), new BigDecimal("1500.00")));
	}

	@Test
	void shouldReturnZerosAndNullsForUserWithoutData() {
		DashboardSummaryResponse result = useCase.execute(USER_ID);

		assertThat(result).isEqualTo(new DashboardSummaryResponse(
				"2026-11", new BigDecimal("0.00"), null, new BigDecimal("0.00"), new BigDecimal("0.00"), null));
	}

	@Test
	void shouldReturnNullChangeWhenPreviousBalanceIsZero() {
		givenBalances(List.of(income("100.00")), List.of());

		DashboardSummaryResponse result = useCase.execute(USER_ID);

		assertThat(result.availableFunds()).isEqualTo(new BigDecimal("100.00"));
		assertThat(result.availableFundsChangePercent()).isNull();
	}

	@Test
	void shouldReturnNullChangeWhenPreviousBalanceIsNegative() {
		givenBalances(List.of(income("50.00")), List.of(expense("100.00")));

		DashboardSummaryResponse result = useCase.execute(USER_ID);

		assertThat(result.availableFunds()).isEqualTo(new BigDecimal("50.00"));
		assertThat(result.availableFundsChangePercent()).isNull();
	}

	@Test
	void shouldRoundChangeToOneDecimalHalfUp() {
		givenBalances(List.of(income("200.10")), List.of(income("200.00")));

		DashboardSummaryResponse result = useCase.execute(USER_ID);

		// 0.10 * 100 / 200.00 = 0.05 exactly: HALF_UP gives 0.1 (HALF_EVEN would give 0.0).
		assertThat(result.availableFundsChangePercent()).isEqualTo(new BigDecimal("0.1"));
	}

	@Test
	void shouldReturnNegativeChangeWhenBalanceDropped() {
		givenBalances(List.of(income("900.00")), List.of(income("1000.00")));

		DashboardSummaryResponse result = useCase.execute(USER_ID);

		assertThat(result.availableFundsChangePercent()).isEqualTo(new BigDecimal("-10.0"));
	}

	@Test
	void shouldUseBusinessZoneMonthAtMonthEndAcrossYearBoundary() {
		useCase = new GetDashboardSummaryUseCase(transactionRepository, budgetLimitRepository, MONTH_END_CLOCK);
		given(transactionRepository.sumByTypeBetween(USER_ID, DECEMBER_START, LocalDate.of(2027, 1, 1)))
				.willReturn(List.of(expense("10.00")));
		given(budgetLimitRepository.sumLimitAmount(USER_ID, 2026, 12)).willReturn(Optional.of(new BigDecimal("100.00")));

		DashboardSummaryResponse result = useCase.execute(USER_ID);

		// 23:30 UTC on 30 November is already 1 December in Warsaw.
		assertThat(result.month()).isEqualTo("2026-12");
		assertThat(result.monthExpenses()).isEqualTo(new BigDecimal("10.00"));
		assertThat(result.monthLimitTotal()).isEqualTo(new BigDecimal("100.00"));
	}

	private void givenBalances(List<TypeTotal> upToToday, List<TypeTotal> beforeMonth) {
		given(transactionRepository.sumByTypeBefore(USER_ID, DAY_AFTER_TODAY)).willReturn(upToToday);
		given(transactionRepository.sumByTypeBefore(USER_ID, NOVEMBER_START)).willReturn(beforeMonth);
	}

	private static TypeTotal income(String total) {
		return new TypeTotal(TransactionType.INCOME, new BigDecimal(total));
	}

	private static TypeTotal expense(String total) {
		return new TypeTotal(TransactionType.EXPENSE, new BigDecimal(total));
	}

}
