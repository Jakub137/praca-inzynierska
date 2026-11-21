package pl.saldo.goal.usecase;

import java.util.UUID;

import org.springframework.stereotype.Component;

import pl.saldo.goal.domain.SavingsGoalEntity;
import pl.saldo.goal.infrastructure.SavingsGoalRepository;
import pl.saldo.shared.error.ResourceNotFoundException;

@Component
public class OwnedSavingsGoalFinder {

	private final SavingsGoalRepository savingsGoalRepository;

	public OwnedSavingsGoalFinder(SavingsGoalRepository savingsGoalRepository) {
		this.savingsGoalRepository = savingsGoalRepository;
	}

	// Another user's goal is reported exactly like a missing one (404), never 403.
	public SavingsGoalEntity findOwned(Long id, UUID userId) {
		return savingsGoalRepository.findByIdAndUserId(id, userId).orElseThrow(() -> notFound(id));
	}

	// Takes the row lock, so it must be called inside a transaction; use it for every change of a goal's amounts.
	public SavingsGoalEntity findOwnedForUpdate(Long id, UUID userId) {
		return savingsGoalRepository.findForUpdateByIdAndUserId(id, userId).orElseThrow(() -> notFound(id));
	}

	private static ResourceNotFoundException notFound(Long id) {
		return new ResourceNotFoundException("Savings goal not found: " + id);
	}

}
