package pl.saldo.budget.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.budget.api.BudgetUsageResponse;
import pl.saldo.budget.domain.BudgetUsageCalculator;
import pl.saldo.budget.infrastructure.BudgetLimitRepository;
import pl.saldo.budget.infrastructure.BudgetLimitRow;
import pl.saldo.transaction.infrastructure.CategorySpending;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@Service
public class GetBudgetUsageUseCase {

	private static final int AMOUNT_SCALE = 2;

	private final BudgetLimitRepository budgetLimitRepository;
	private final TransactionRepository transactionRepository;
	private final Clock clock;

	public GetBudgetUsageUseCase(
			BudgetLimitRepository budgetLimitRepository,
			TransactionRepository transactionRepository,
			Clock clock) {
		this.budgetLimitRepository = budgetLimitRepository;
		this.transactionRepository = transactionRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<BudgetUsageResponse> execute(UUID userId, GetBudgetUsageQuery query) {
		YearMonth period = query.resolvePeriod(clock);
		List<BudgetLimitRow> limits = budgetLimitRepository.findUsageRows(
				userId, period.getYear(), period.getMonthValue());
		if (limits.isEmpty()) {
			return List.of();
		}
		Map<Long, BigDecimal> spentByCategory = findSpentByCategory(userId, limits, period);
		return limits.stream()
				.map(limit -> toResponse(limit, spentByCategory.getOrDefault(limit.categoryId(), BigDecimal.ZERO)))
				.toList();
	}

	// The month is the half-open range [first day, first day of the next month).
	private Map<Long, BigDecimal> findSpentByCategory(UUID userId, List<BudgetLimitRow> limits, YearMonth period) {
		List<Long> categoryIds = limits.stream().map(BudgetLimitRow::categoryId).toList();
		return transactionRepository
				.sumExpensesByCategory(userId, categoryIds, period.atDay(1), period.plusMonths(1).atDay(1))
				.stream()
				.collect(Collectors.toMap(CategorySpending::categoryId, CategorySpending::total));
	}

	private BudgetUsageResponse toResponse(BudgetLimitRow limit, BigDecimal spent) {
		BigDecimal limitAmount = normalize(limit.limitAmount());
		BigDecimal spentAmount = normalize(spent);
		return new BudgetUsageResponse(
				limit.categoryId(),
				limit.categoryName(),
				limitAmount,
				spentAmount,
				BudgetUsageCalculator.percentage(spentAmount, limitAmount),
				BudgetUsageCalculator.status(spentAmount, limitAmount));
	}

	// COALESCE-like defaults and SUM may come back with scale 0; amounts are always exposed with 2 decimals.
	private static BigDecimal normalize(BigDecimal amount) {
		return amount.setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY);
	}

}
