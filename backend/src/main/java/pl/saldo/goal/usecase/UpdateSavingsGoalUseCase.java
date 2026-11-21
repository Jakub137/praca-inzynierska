package pl.saldo.goal.usecase;

import java.time.Clock;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.goal.api.SavingsGoalResponse;
import pl.saldo.goal.domain.SavingsGoalDates;
import pl.saldo.goal.domain.SavingsGoalEntity;

@Service
public class UpdateSavingsGoalUseCase {

	private final OwnedSavingsGoalFinder ownedSavingsGoalFinder;
	private final Clock clock;

	public UpdateSavingsGoalUseCase(OwnedSavingsGoalFinder ownedSavingsGoalFinder, Clock clock) {
		this.ownedSavingsGoalFinder = ownedSavingsGoalFinder;
		this.clock = clock;
	}

	// No explicit save: the entity is managed inside the transaction, so the changes are flushed on commit.
	// The row is locked: Hibernate writes every column, so an unlocked edit could overwrite a concurrent deposit.
	@Transactional
	public SavingsGoalResponse execute(UUID userId, Long id, SavingsGoalCommand command) {
		SavingsGoalEntity goal = ownedSavingsGoalFinder.findOwnedForUpdate(id, userId);
		LocalDate today = SavingsGoalDates.today(clock);
		// Only a changed deadline is checked, so a goal whose deadline has passed can still be renamed.
		if (!command.targetDate().equals(goal.getTargetDate())) {
			SavingsGoalDates.requireValidTargetDate(today, command.targetDate());
		}
		goal.update(command.name(), command.targetAmount(), command.targetDate());
		return SavingsGoalResponse.fromEntity(goal, today);
	}

}
