package pl.saldo.budget.infrastructure;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import pl.saldo.budget.domain.BudgetLimitEntity;

public interface BudgetLimitRepository extends JpaRepository<BudgetLimitEntity, Long> {

	// Parameter order follows the unique key uq_budget_limits_user_year_month_category.
	Optional<BudgetLimitEntity> findByUserIdAndYearAndMonthAndCategoryId(
			UUID userId, int year, int month, Long categoryId);

	// Only the user's limits of the given month, with the category name; ordered by name (database collation
	// pl-PL), then by id, so equal names keep a stable order.
	@Query("""
			select new pl.saldo.budget.infrastructure.BudgetLimitRow(c.id, c.name, bl.limitAmount)
			from BudgetLimitEntity bl, CategoryEntity c
			where c.id = bl.categoryId
				and bl.userId = :userId
				and bl.year = :budgetYear
				and bl.month = :budgetMonth
			order by c.name, c.id""")
	List<BudgetLimitRow> findUsageRows(
			@Param("userId") UUID userId,
			@Param("budgetYear") int budgetYear,
			@Param("budgetMonth") int budgetMonth);

	// SUM over zero rows is NULL, so a month without limits is Optional.empty() and not 0: "no limits" is not
	// the same as "limits totalling zero".
	@Query("""
			select sum(bl.limitAmount)
			from BudgetLimitEntity bl
			where bl.userId = :userId
				and bl.year = :budgetYear
				and bl.month = :budgetMonth""")
	Optional<BigDecimal> sumLimitAmount(
			@Param("userId") UUID userId,
			@Param("budgetYear") int budgetYear,
			@Param("budgetMonth") int budgetMonth);

}
