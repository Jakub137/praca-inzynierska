package pl.saldo.transaction.infrastructure;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import pl.saldo.transaction.domain.TransactionEntity;

public interface TransactionRepository extends JpaRepository<TransactionEntity, UUID> {

	@Query("""
			select t from TransactionEntity t join fetch t.category
			where t.id = :id and t.userId = :userId""")
	Optional<TransactionEntity> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

}
