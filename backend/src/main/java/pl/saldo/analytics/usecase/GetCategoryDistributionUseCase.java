package pl.saldo.analytics.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.analytics.api.CategoryDistributionResponse;
import pl.saldo.analytics.api.CategoryShareResponse;
import pl.saldo.shared.config.BusinessTime;
import pl.saldo.transaction.infrastructure.CategoryExpenseTotal;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@Service
public class GetCategoryDistributionUseCase {

	private static final int AMOUNT_SCALE = 2;
	private static final int PERCENTAGE_SCALE = 2;
	private static final BigDecimal PERCENT_BASE = BigDecimal.valueOf(100);
	private static final Comparator<CategoryExpenseTotal> LARGEST_FIRST = Comparator
			.comparing(CategoryExpenseTotal::total, Comparator.reverseOrder())
			.thenComparing(CategoryExpenseTotal::categoryName)
			.thenComparing(CategoryExpenseTotal::categoryId);

	private final TransactionRepository transactionRepository;
	private final Clock clock;

	public GetCategoryDistributionUseCase(TransactionRepository transactionRepository, Clock clock) {
		this.transactionRepository = transactionRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public CategoryDistributionResponse execute(UUID userId, GetCategoryDistributionQuery query) {
		GetCategoryDistributionQuery.DateRange range =
				query.resolveRange(YearMonth.now(clock.withZone(BusinessTime.ZONE)));
		// The repository takes a half-open range, so the inclusive dateTo is moved by one day.
		List<CategoryExpenseTotal> totals = transactionRepository
				.sumAllExpensesByCategory(userId, range.dateFrom(), range.dateTo().plusDays(1));
		BigDecimal totalExpenses = sumOf(totals);
		List<CategoryShareResponse> categories = totals.stream()
				.sorted(LARGEST_FIRST)
				.map(total -> toShare(total, totalExpenses))
				.toList();
		return new CategoryDistributionResponse(range.dateFrom(), range.dateTo(), totalExpenses, categories);
	}

	// Adds the per-category sums computed by the database, so the total always matches the listed amounts.
	private static BigDecimal sumOf(List<CategoryExpenseTotal> totals) {
		return totals.stream()
				.map(CategoryExpenseTotal::total)
				.reduce(BigDecimal.ZERO, BigDecimal::add)
				.setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY);
	}

	// Called only for existing rows, and every amount_pln is positive (database CHECK), so totalExpenses is not zero.
	// Each share is rounded on its own: the shares may not add up to exactly 100.00.
	private static CategoryShareResponse toShare(CategoryExpenseTotal total, BigDecimal totalExpenses) {
		return new CategoryShareResponse(
				total.categoryId(),
				total.categoryName(),
				total.total().setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY),
				total.total().multiply(PERCENT_BASE).divide(totalExpenses, PERCENTAGE_SCALE, RoundingMode.HALF_UP));
	}

}
