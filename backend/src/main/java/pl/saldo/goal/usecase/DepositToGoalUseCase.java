package pl.saldo.goal.usecase;

import java.time.Clock;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.goal.api.SavingsGoalResponse;
import pl.saldo.goal.domain.SavingsGoalDates;
import pl.saldo.goal.domain.SavingsGoalEntity;

@Service
public class DepositToGoalUseCase {

	private final OwnedSavingsGoalFinder ownedSavingsGoalFinder;
	private final Clock clock;

	public DepositToGoalUseCase(OwnedSavingsGoalFinder ownedSavingsGoalFinder, Clock clock) {
		this.ownedSavingsGoalFinder = ownedSavingsGoalFinder;
		this.clock = clock;
	}

	// The goal is read under a row lock, so the total checked in deposit() is the current one and two parallel
	// deposits are applied one after another. No explicit save: changes are flushed when the transaction commits.
	@Transactional
	public SavingsGoalResponse execute(UUID userId, Long id, DepositToGoalCommand command) {
		SavingsGoalEntity goal = ownedSavingsGoalFinder.findOwnedForUpdate(id, userId);
		goal.deposit(command.amount());
		return SavingsGoalResponse.fromEntity(goal, SavingsGoalDates.today(clock));
	}

}
