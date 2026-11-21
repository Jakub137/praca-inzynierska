package pl.saldo.recurring.infrastructure;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import pl.saldo.recurring.domain.RecurringPaymentEntity;

public interface RecurringPaymentRepository extends JpaRepository<RecurringPaymentEntity, Long> {

	// The graph loads the category in the same SELECT (no N+1 when mapping to responses).
	// Deterministic order: the nearest due date first, equal dates by creation order (id).
	@EntityGraph(attributePaths = "category")
	List<RecurringPaymentEntity> findAllByUserIdOrderByNextDueDateAscIdAsc(UUID userId);

}
