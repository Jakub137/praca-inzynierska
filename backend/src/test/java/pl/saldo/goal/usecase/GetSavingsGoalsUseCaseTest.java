package pl.saldo.goal.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.goal.api.SavingsGoalResponse;
import pl.saldo.goal.domain.GoalStatus;
import pl.saldo.goal.domain.SavingsGoalEntity;
import pl.saldo.goal.infrastructure.SavingsGoalRepository;

@ExtendWith(MockitoExtension.class)
class GetSavingsGoalsUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	// 11:00 on 2026-11-20 in Warsaw.
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");

	@Mock
	private SavingsGoalRepository savingsGoalRepository;

	private GetSavingsGoalsUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new GetSavingsGoalsUseCase(savingsGoalRepository, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	@Test
	void shouldMapGoalsInRepositoryOrderWithComputedFields() {
		SavingsGoalEntity soon = goal(1L, "Rower", "500.00", LocalDate.of(2026, 12, 15));
		SavingsGoalEntity later = goal(2L, "Wakacje", "6000.00", LocalDate.of(2027, 7, 15));
		given(savingsGoalRepository.findAllByUserIdOrderByTargetDateAscIdAsc(USER_ID)).willReturn(List.of(soon, later));

		List<SavingsGoalResponse> result = useCase.execute(USER_ID);

		assertThat(result).containsExactly(
				new SavingsGoalResponse(1L, "Rower", new BigDecimal("500.00"), new BigDecimal("0.00"),
						LocalDate.of(2026, 12, 15), GoalStatus.ACTIVE, 0, new BigDecimal("500.00")),
				new SavingsGoalResponse(2L, "Wakacje", new BigDecimal("6000.00"), new BigDecimal("0.00"),
						LocalDate.of(2027, 7, 15), GoalStatus.ACTIVE, 7, new BigDecimal("857.15")));
	}

	@Test
	void shouldReturnEmptyListWhenUserHasNoGoals() {
		given(savingsGoalRepository.findAllByUserIdOrderByTargetDateAscIdAsc(USER_ID)).willReturn(List.of());

		assertThat(useCase.execute(USER_ID)).isEmpty();
	}

	private static SavingsGoalEntity goal(Long id, String name, String target, LocalDate targetDate) {
		SavingsGoalEntity goal = new SavingsGoalEntity(USER_ID, name, new BigDecimal(target), targetDate, NOW);
		ReflectionTestUtils.setField(goal, "id", id);
		return goal;
	}

}
