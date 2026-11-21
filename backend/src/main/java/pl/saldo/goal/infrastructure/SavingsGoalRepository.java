package pl.saldo.goal.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import pl.saldo.goal.domain.SavingsGoalEntity;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoalEntity, Long> {

	// Ownership is part of the lookup: a foreign goal looks exactly like a missing one.
	Optional<SavingsGoalEntity> findByIdAndUserId(Long id, UUID userId);

	// Row lock held until the transaction ends: a concurrent deposit or edit of the same goal waits instead of
	// overwriting current_amount with a stale value. The text between "find" and "By" is only a label.
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	Optional<SavingsGoalEntity> findForUpdateByIdAndUserId(Long id, UUID userId);

	// Deterministic order: the nearest deadline first, equal deadlines by creation order (id).
	List<SavingsGoalEntity> findAllByUserIdOrderByTargetDateAscIdAsc(UUID userId);

}
