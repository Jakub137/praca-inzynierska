package pl.saldo.budget.infrastructure;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import pl.saldo.budget.domain.BudgetLimitEntity;

public interface BudgetLimitRepository extends JpaRepository<BudgetLimitEntity, Long> {

	// Parameter order follows the unique key uq_budget_limits_user_year_month_category.
	Optional<BudgetLimitEntity> findByUserIdAndYearAndMonthAndCategoryId(
			UUID userId, int year, int month, Long categoryId);

}
