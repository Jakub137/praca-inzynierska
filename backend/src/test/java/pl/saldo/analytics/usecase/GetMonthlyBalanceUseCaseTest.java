package pl.saldo.analytics.usecase;

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

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import pl.saldo.analytics.api.MonthlyBalanceResponse;
import pl.saldo.analytics.domain.InvalidAnalyticsQueryException;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.MonthlyTypeTotal;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class GetMonthlyBalanceUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final String NOVEMBER_NOW = "2026-11-25T10:00:00Z";

	@Mock
	private TransactionRepository transactionRepository;

	@Test
	void shouldReturnSixMonthsOldestFirstWithZerosForEmptyMonths() {
		given(transactionRepository.sumByMonthAndType(
				USER_ID, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 12, 1)))
				.willReturn(List.of(
						new MonthlyTypeTotal(2026, 11, TransactionType.EXPENSE, new BigDecimal("100")),
						new MonthlyTypeTotal(2026, 7, TransactionType.INCOME, new BigDecimal("1000.00")),
						new MonthlyTypeTotal(2026, 7, TransactionType.EXPENSE, new BigDecimal("250.5"))));

		List<MonthlyBalanceResponse> result = useCaseAt(NOVEMBER_NOW)
				.execute(USER_ID, new GetMonthlyBalanceQuery(null));

		assertThat(result).containsExactly(
				month("2026-06", "0.00", "0.00"),
				month("2026-07", "1000.00", "250.50"),
				month("2026-08", "0.00", "0.00"),
				month("2026-09", "0.00", "0.00"),
				month("2026-10", "0.00", "0.00"),
				month("2026-11", "0.00", "100.00"));
	}

	@Test
	void shouldBuildContinuousAxisAcrossYearBoundary() {
		given(transactionRepository.sumByMonthAndType(
				USER_ID, LocalDate.of(2026, 11, 1), LocalDate.of(2027, 2, 1)))
				.willReturn(List.of(
						new MonthlyTypeTotal(2026, 12, TransactionType.INCOME, new BigDecimal("10.00"))));

		List<MonthlyBalanceResponse> result = useCaseAt("2027-01-15T10:00:00Z")
				.execute(USER_ID, new GetMonthlyBalanceQuery("3"));

		assertThat(result).containsExactly(
				month("2026-11", "0.00", "0.00"),
				month("2026-12", "10.00", "0.00"),
				month("2027-01", "0.00", "0.00"));
	}

	@Test
	void shouldUseWarsawMonthWhenClockIsStillInPreviousMonthInUtc() {
		given(transactionRepository.sumByMonthAndType(
				USER_ID, LocalDate.of(2026, 12, 1), LocalDate.of(2027, 1, 1)))
				.willReturn(List.of());

		List<MonthlyBalanceResponse> result = useCaseAt("2026-11-30T23:30:00Z")
				.execute(USER_ID, new GetMonthlyBalanceQuery("1"));

		assertThat(result).containsExactly(month("2026-12", "0.00", "0.00"));
	}

	@Test
	void shouldNotQueryRepositoryWhenMonthsIsInvalid() {
		assertThatExceptionOfType(InvalidAnalyticsQueryException.class)
				.isThrownBy(() -> useCaseAt(NOVEMBER_NOW).execute(USER_ID, new GetMonthlyBalanceQuery("13")));

		then(transactionRepository).shouldHaveNoInteractions();
	}

	private GetMonthlyBalanceUseCase useCaseAt(String instant) {
		return new GetMonthlyBalanceUseCase(
				transactionRepository, Clock.fixed(Instant.parse(instant), ZoneOffset.UTC));
	}

	private static MonthlyBalanceResponse month(String month, String income, String expenses) {
		return new MonthlyBalanceResponse(month, new BigDecimal(income), new BigDecimal(expenses));
	}

}
