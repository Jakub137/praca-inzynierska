package pl.saldo.goal.usecase;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.goal.api.SavingsGoalResponse;
import pl.saldo.goal.domain.SavingsGoalDates;
import pl.saldo.goal.domain.SavingsGoalEntity;
import pl.saldo.goal.infrastructure.SavingsGoalRepository;

@Service
public class CreateSavingsGoalUseCase {

	private final SavingsGoalRepository savingsGoalRepository;
	private final Clock clock;

	public CreateSavingsGoalUseCase(SavingsGoalRepository savingsGoalRepository, Clock clock) {
		this.savingsGoalRepository = savingsGoalRepository;
		this.clock = clock;
	}

	@Transactional
	public SavingsGoalResponse execute(UUID userId, SavingsGoalCommand command) {
		LocalDate today = SavingsGoalDates.today(clock);
		SavingsGoalDates.requireValidTargetDate(today, command.targetDate());
		SavingsGoalEntity goal = new SavingsGoalEntity(
				userId, command.name(), command.targetAmount(), command.targetDate(), Instant.now(clock));
		return SavingsGoalResponse.fromEntity(savingsGoalRepository.save(goal), today);
	}

}
