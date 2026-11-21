package pl.saldo.goal.usecase;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.goal.infrastructure.SavingsGoalRepository;
import pl.saldo.shared.error.ResourceNotFoundException;

@Service
public class DeleteSavingsGoalUseCase {

	private final SavingsGoalRepository savingsGoalRepository;

	public DeleteSavingsGoalUseCase(SavingsGoalRepository savingsGoalRepository) {
		this.savingsGoalRepository = savingsGoalRepository;
	}

	@Transactional
	public void execute(UUID userId, Long id) {
		savingsGoalRepository.delete(savingsGoalRepository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new ResourceNotFoundException("Savings goal not found: " + id)));
	}

}
