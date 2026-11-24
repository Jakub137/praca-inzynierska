package pl.saldo.ai.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import pl.saldo.ai.domain.SpendingAnomaly;
import pl.saldo.transaction.infrastructure.CategoryExpenseTotal;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class GetDashboardInsightUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Clock NOVEMBER_CLOCK = Clock.fixed(Instant.parse("2026-11-20T10:00:00Z"), ZoneOffset.UTC);

	@Mock
	private TransactionRepository transactionRepository;

	@Test
	void shouldReturnStrongestAnomalyUsingThreePreviousFullMonths() {
		givenExpenses(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1),
				total(1L, "Jedzenie", "410.00"), total(2L, "Rozrywka", "142.00"));
		givenExpenses(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 11, 1),
				total(1L, "Jedzenie", "400.00"), total(2L, "Rozrywka", "100.00"));
		givenExpenses(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1),
				total(1L, "Jedzenie", "400.00"), total(2L, "Rozrywka", "100.00"));
		givenExpenses(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 9, 1),
				total(1L, "Jedzenie", "400.00"), total(2L, "Rozrywka", "100.00"));

		Optional<SpendingAnomaly> result = useCase(NOVEMBER_CLOCK).execute(USER_ID);

		assertThat(result).contains(new SpendingAnomaly(
				2L, "Rozrywka", 42, new BigDecimal("142.00"), new BigDecimal("100.00")));
	}

	@Test
	void shouldReturnEmptyAndSkipBaselineQueriesWhenNothingWasSpentThisMonth() {
		givenExpenses(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1));

		Optional<SpendingAnomaly> result = useCase(NOVEMBER_CLOCK).execute(USER_ID);

		assertThat(result).isEmpty();
		then(transactionRepository).should()
				.sumAllExpensesByCategory(USER_ID, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1));
		then(transactionRepository).shouldHaveNoMoreInteractions();
	}

	@Test
	void shouldTreatMissingBaselineMonthAsZeroAndSkipTheCategory() {
		givenExpenses(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1), total(2L, "Rozrywka", "1000.00"));
		givenExpenses(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 11, 1), total(2L, "Rozrywka", "100.00"));
		givenExpenses(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1), total(1L, "Jedzenie", "400.00"));
		givenExpenses(LocalDate.of(2026, 8, 1), LocalDate.of(2026, 9, 1), total(2L, "Rozrywka", "100.00"));

		Optional<SpendingAnomaly> result = useCase(NOVEMBER_CLOCK).execute(USER_ID);

		assertThat(result).isEmpty();
	}

	@Test
	void shouldTakeBaselineMonthsAcrossTheYearBoundaryInJanuary() {
		Clock januaryClock = Clock.fixed(Instant.parse("2027-01-15T10:00:00Z"), ZoneOffset.UTC);
		givenExpenses(LocalDate.of(2027, 1, 1), LocalDate.of(2027, 2, 1), total(2L, "Rozrywka", "150.00"));
		givenExpenses(LocalDate.of(2026, 12, 1), LocalDate.of(2027, 1, 1), total(2L, "Rozrywka", "100.00"));
		givenExpenses(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1), total(2L, "Rozrywka", "100.00"));
		givenExpenses(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 11, 1), total(2L, "Rozrywka", "100.00"));

		Optional<SpendingAnomaly> result = useCase(januaryClock).execute(USER_ID);

		assertThat(result).contains(new SpendingAnomaly(
				2L, "Rozrywka", 50, new BigDecimal("150.00"), new BigDecimal("100.00")));
	}

	@Test
	void shouldUseTheBusinessZoneToChooseTheCurrentMonth() {
		// 23:30 UTC on 30 Nov is 00:30 on 1 Dec in Warsaw, so the current month is December.
		Clock monthEndClock = Clock.fixed(Instant.parse("2026-11-30T23:30:00Z"), ZoneOffset.UTC);
		givenExpenses(LocalDate.of(2026, 12, 1), LocalDate.of(2027, 1, 1), total(2L, "Rozrywka", "150.00"));
		givenExpenses(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1), total(2L, "Rozrywka", "100.00"));
		givenExpenses(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 11, 1), total(2L, "Rozrywka", "100.00"));
		givenExpenses(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 1), total(2L, "Rozrywka", "100.00"));

		Optional<SpendingAnomaly> result = useCase(monthEndClock).execute(USER_ID);

		assertThat(result).contains(new SpendingAnomaly(
				2L, "Rozrywka", 50, new BigDecimal("150.00"), new BigDecimal("100.00")));
	}

	private GetDashboardInsightUseCase useCase(Clock clock) {
		return new GetDashboardInsightUseCase(transactionRepository, clock);
	}

	private void givenExpenses(LocalDate start, LocalDate end, CategoryExpenseTotal... totals) {
		given(transactionRepository.sumAllExpensesByCategory(USER_ID, start, end)).willReturn(List.of(totals));
	}

	private static CategoryExpenseTotal total(Long categoryId, String categoryName, String amount) {
		return new CategoryExpenseTotal(categoryId, categoryName, new BigDecimal(amount));
	}

}
