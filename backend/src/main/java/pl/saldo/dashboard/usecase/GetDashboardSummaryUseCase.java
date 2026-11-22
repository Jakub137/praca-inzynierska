package pl.saldo.dashboard.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.budget.infrastructure.BudgetLimitRepository;
import pl.saldo.dashboard.api.DashboardSummaryResponse;
import pl.saldo.shared.config.BusinessTime;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;
import pl.saldo.transaction.infrastructure.TypeTotal;

@Service
public class GetDashboardSummaryUseCase {

	private static final int AMOUNT_SCALE = 2;
	private static final int PERCENT_SCALE = 1;
	private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

	private final TransactionRepository transactionRepository;
	private final BudgetLimitRepository budgetLimitRepository;
	private final Clock clock;

	public GetDashboardSummaryUseCase(
			TransactionRepository transactionRepository,
			BudgetLimitRepository budgetLimitRepository,
			Clock clock) {
		this.transactionRepository = transactionRepository;
		this.budgetLimitRepository = budgetLimitRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public DashboardSummaryResponse execute(UUID userId) {
		// "Today" is read once, in the business zone, so the balance and the month always refer to the same day.
		LocalDate today = LocalDate.now(clock.withZone(BusinessTime.ZONE));
		YearMonth period = YearMonth.from(today);
		LocalDate monthStart = period.atDay(1);

		BigDecimal availableFunds = balance(transactionRepository.sumByTypeBefore(userId, today.plusDays(1)));
		BigDecimal previousBalance = balance(transactionRepository.sumByTypeBefore(userId, monthStart));
		Map<TransactionType, BigDecimal> monthTotals = totalsByType(
				transactionRepository.sumByTypeBetween(userId, monthStart, period.plusMonths(1).atDay(1)));

		return new DashboardSummaryResponse(
				period.toString(),
				availableFunds,
				changePercent(availableFunds, previousBalance).orElse(null),
				amountOf(monthTotals, TransactionType.EXPENSE),
				amountOf(monthTotals, TransactionType.INCOME),
				budgetLimitRepository.sumLimitAmount(userId, period.getYear(), period.getMonthValue())
						.map(GetDashboardSummaryUseCase::normalize)
						.orElse(null));
	}

	private static BigDecimal balance(List<TypeTotal> totals) {
		Map<TransactionType, BigDecimal> byType = totalsByType(totals);
		return amountOf(byType, TransactionType.INCOME).subtract(amountOf(byType, TransactionType.EXPENSE));
	}

	private static Map<TransactionType, BigDecimal> totalsByType(List<TypeTotal> totals) {
		return totals.stream().collect(Collectors.toMap(TypeTotal::type, TypeTotal::total));
	}

	private static BigDecimal amountOf(Map<TransactionType, BigDecimal> totals, TransactionType type) {
		return normalize(totals.getOrDefault(type, BigDecimal.ZERO));
	}

	// Multiply before dividing to keep precision; a previous balance that is zero or negative has no meaningful percentage.
	private static Optional<BigDecimal> changePercent(BigDecimal current, BigDecimal previous) {
		if (previous.signum() <= 0) {
			return Optional.empty();
		}
		return Optional.of(current.subtract(previous).multiply(HUNDRED).divide(previous, PERCENT_SCALE, RoundingMode.HALF_UP));
	}

	// SUM may come back with scale 0; amounts are always exposed with 2 decimals.
	private static BigDecimal normalize(BigDecimal amount) {
		return amount.setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY);
	}

}
