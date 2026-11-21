package pl.saldo.goal.usecase;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.goal.api.SavingsGoalResponse;
import pl.saldo.goal.domain.SavingsGoalDates;
import pl.saldo.goal.domain.SavingsGoalEntity;
import pl.saldo.goal.infrastructure.SavingsGoalRepository;
import pl.saldo.shared.error.ResourceNotFoundException;

@Service
public class UpdateSavingsGoalUseCase {

	private final SavingsGoalRepository savingsGoalRepository;
	private final Clock clock;

	public UpdateSavingsGoalUseCase(SavingsGoalRepository savingsGoalRepository, Clock clock) {
		this.savingsGoalRepository = savingsGoalRepository;
		this.clock = clock;
	}

	// No explicit save: the entity is managed inside the transaction, so the changes are flushed on commit.
	@Transactional
	public SavingsGoalResponse execute(UUID userId, Long id, SavingsGoalCommand command) {
		SavingsGoalEntity goal = savingsGoalRepository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new ResourceNotFoundException("Savings goal not found: " + id));
		LocalDate today = SavingsGoalDates.today(clock);
		// Only a changed deadline is checked, so a goal whose deadline has passed can still be renamed.
		if (!command.targetDate().equals(goal.getTargetDate())) {
			SavingsGoalDates.requireValidTargetDate(today, command.targetDate());
		}
		goal.update(command.name(), command.targetAmount(), command.targetDate());
		return SavingsGoalResponse.fromEntity(goal, today);
	}

}
