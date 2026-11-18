package pl.saldo.transaction.infrastructure;

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

}
