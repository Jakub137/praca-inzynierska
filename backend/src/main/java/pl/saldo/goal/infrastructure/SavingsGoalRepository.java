package pl.saldo.goal.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import pl.saldo.goal.domain.SavingsGoalEntity;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoalEntity, Long> {

	// Ownership is part of the lookup: a foreign goal looks exactly like a missing one.
	Optional<SavingsGoalEntity> findByIdAndUserId(Long id, UUID userId);

	// Deterministic order: the nearest deadline first, equal deadlines by creation order (id).
	List<SavingsGoalEntity> findAllByUserIdOrderByTargetDateAscIdAsc(UUID userId);

}
