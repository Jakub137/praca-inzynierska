package pl.saldo.goal.usecase;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.goal.infrastructure.SavingsGoalRepository;

@Service
public class DeleteSavingsGoalUseCase {

	private final OwnedSavingsGoalFinder ownedSavingsGoalFinder;
	private final SavingsGoalRepository savingsGoalRepository;

	public DeleteSavingsGoalUseCase(
			OwnedSavingsGoalFinder ownedSavingsGoalFinder, SavingsGoalRepository savingsGoalRepository) {
		this.ownedSavingsGoalFinder = ownedSavingsGoalFinder;
		this.savingsGoalRepository = savingsGoalRepository;
	}

	// No lock needed: the row is only removed, nothing is written from a stale copy.
	@Transactional
	public void execute(UUID userId, Long id) {
		savingsGoalRepository.delete(ownedSavingsGoalFinder.findOwned(id, userId));
	}

}
