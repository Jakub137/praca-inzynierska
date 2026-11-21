package pl.saldo.goal.usecase;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.goal.api.SavingsGoalResponse;
import pl.saldo.goal.domain.SavingsGoalDates;
import pl.saldo.goal.infrastructure.SavingsGoalRepository;

@Service
public class GetSavingsGoalsUseCase {

	private final SavingsGoalRepository savingsGoalRepository;
	private final Clock clock;

	public GetSavingsGoalsUseCase(SavingsGoalRepository savingsGoalRepository, Clock clock) {
		this.savingsGoalRepository = savingsGoalRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<SavingsGoalResponse> execute(UUID userId) {
		LocalDate today = SavingsGoalDates.today(clock);
		return savingsGoalRepository.findAllByUserIdOrderByTargetDateAscIdAsc(userId).stream()
				.map(goal -> SavingsGoalResponse.fromEntity(goal, today))
				.toList();
	}

}
