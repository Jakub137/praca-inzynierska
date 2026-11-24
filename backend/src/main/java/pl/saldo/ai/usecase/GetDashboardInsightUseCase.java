package pl.saldo.ai.usecase;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.ai.domain.CategorySpendingHistory;
import pl.saldo.ai.domain.SpendingAnomaly;
import pl.saldo.ai.domain.SpendingAnomalyDetector;
import pl.saldo.shared.config.BusinessTime;
import pl.saldo.transaction.infrastructure.CategoryExpenseTotal;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@Service
public class GetDashboardInsightUseCase {

	private final TransactionRepository transactionRepository;
	private final Clock clock;

	public GetDashboardInsightUseCase(TransactionRepository transactionRepository, Clock clock) {
		this.transactionRepository = transactionRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public Optional<SpendingAnomaly> execute(UUID userId) {
		// The current month is read once, in the business zone (not in UTC); the baseline months are derived from it.
		YearMonth currentMonth = YearMonth.now(clock.withZone(BusinessTime.ZONE));
		List<CategoryExpenseTotal> currentTotals = expensesIn(userId, currentMonth);
		if (currentTotals.isEmpty()) {
			return Optional.empty();
		}
		List<Map<Long, BigDecimal>> baseline = baselineMonths(currentMonth).stream()
				.map(month -> amountsByCategory(expensesIn(userId, month)))
				.toList();
		return SpendingAnomalyDetector.findStrongest(currentTotals.stream()
				.map(total -> toHistory(total, baseline))
				.toList());
	}

	// A month is the half-open range [first day, first day of the next month), future-dated rows included (as in T-053).
	private List<CategoryExpenseTotal> expensesIn(UUID userId, YearMonth month) {
		return transactionRepository.sumAllExpensesByCategory(userId, month.atDay(1), month.plusMonths(1).atDay(1));
	}

	private static List<YearMonth> baselineMonths(YearMonth currentMonth) {
		return IntStream.rangeClosed(1, SpendingAnomalyDetector.BASELINE_MONTHS)
				.mapToObj(offset -> currentMonth.minusMonths(offset))
				.toList();
	}

	private static Map<Long, BigDecimal> amountsByCategory(List<CategoryExpenseTotal> totals) {
		return totals.stream().collect(Collectors.toMap(CategoryExpenseTotal::categoryId, CategoryExpenseTotal::total));
	}

	private static CategorySpendingHistory toHistory(CategoryExpenseTotal current, List<Map<Long, BigDecimal>> baseline) {
		List<BigDecimal> previousAmounts = baseline.stream()
				.map(month -> month.getOrDefault(current.categoryId(), BigDecimal.ZERO))
				.toList();
		return new CategorySpendingHistory(
				current.categoryId(), current.categoryName(), current.total(), previousAmounts);
	}

}
