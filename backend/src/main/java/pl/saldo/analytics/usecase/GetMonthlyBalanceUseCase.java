package pl.saldo.analytics.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.analytics.api.MonthlyBalanceResponse;
import pl.saldo.shared.config.BusinessTime;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.MonthlyTypeTotal;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@Service
public class GetMonthlyBalanceUseCase {

	private static final int AMOUNT_SCALE = 2;

	private final TransactionRepository transactionRepository;
	private final Clock clock;

	public GetMonthlyBalanceUseCase(TransactionRepository transactionRepository, Clock clock) {
		this.transactionRepository = transactionRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<MonthlyBalanceResponse> execute(UUID userId, GetMonthlyBalanceQuery query) {
		int months = query.resolveMonths();
		// The window ends with the current month in the business zone; each month is a whole calendar month.
		YearMonth currentMonth = YearMonth.now(clock.withZone(BusinessTime.ZONE));
		YearMonth firstMonth = currentMonth.minusMonths(months - 1L);
		Map<YearMonth, Map<TransactionType, BigDecimal>> totals = groupByMonth(transactionRepository
				.sumByMonthAndType(userId, firstMonth.atDay(1), currentMonth.plusMonths(1).atDay(1)));
		// The query skips months without transactions, so the axis is generated here, oldest month first.
		return Stream.iterate(firstMonth, month -> month.plusMonths(1))
				.limit(months)
				.map(month -> toResponse(month, totals.getOrDefault(month, Map.of())))
				.toList();
	}

	private static Map<YearMonth, Map<TransactionType, BigDecimal>> groupByMonth(List<MonthlyTypeTotal> rows) {
		return rows.stream().collect(Collectors.groupingBy(
				row -> YearMonth.of(row.year(), row.month()),
				Collectors.toMap(MonthlyTypeTotal::type, MonthlyTypeTotal::total)));
	}

	private static MonthlyBalanceResponse toResponse(YearMonth month, Map<TransactionType, BigDecimal> totals) {
		return new MonthlyBalanceResponse(
				month.toString(),
				amountOf(totals, TransactionType.INCOME),
				amountOf(totals, TransactionType.EXPENSE));
	}

	// A missing type means zero; amounts are always exposed with 2 decimals.
	private static BigDecimal amountOf(Map<TransactionType, BigDecimal> totals, TransactionType type) {
		return totals.getOrDefault(type, BigDecimal.ZERO).setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY);
	}

}
