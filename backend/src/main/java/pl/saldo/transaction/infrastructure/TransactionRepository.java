package pl.saldo.transaction.infrastructure;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import pl.saldo.transaction.domain.TransactionEntity;

public interface TransactionRepository
		extends JpaRepository<TransactionEntity, UUID>, JpaSpecificationExecutor<TransactionEntity> {

	@Query("""
			select t from TransactionEntity t join fetch t.category
			where t.id = :id and t.userId = :userId""")
	Optional<TransactionEntity> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

	// The graph makes Hibernate load the category in the same SELECT (no N+1 when mapping a page to DTOs).
	@Override
	@EntityGraph(attributePaths = "category")
	Page<TransactionEntity> findAll(Specification<TransactionEntity> spec, Pageable pageable);

	// SUM runs in SQL. The range is half-open [startDate, endDate), so the column stays comparable directly and
	// idx_transactions_user_date can be used (no month extraction). The user filter is essential: system
	// categories are shared by all users. Categories without expenses are absent from the result.
	@Query("""
			select new pl.saldo.transaction.infrastructure.CategorySpending(t.category.id, sum(t.amountPln))
			from TransactionEntity t
			where t.userId = :userId
				and t.category.id in :categoryIds
				and t.type = pl.saldo.transaction.domain.TransactionType.EXPENSE
				and t.transactionDate >= :startDate
				and t.transactionDate < :endDate
			group by t.category.id""")
	List<CategorySpending> sumExpensesByCategory(
			@Param("userId") UUID userId,
			@Param("categoryIds") Collection<Long> categoryIds,
			@Param("startDate") LocalDate startDate,
			@Param("endDate") LocalDate endDate);

}
