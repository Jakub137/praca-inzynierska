package pl.saldo.goal.usecase;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import pl.saldo.goal.domain.SavingsGoalEntity;
import pl.saldo.goal.infrastructure.SavingsGoalRepository;
import pl.saldo.shared.error.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class DeleteSavingsGoalUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Long ID = 7L;
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");

	@Mock
	private SavingsGoalRepository savingsGoalRepository;

	private DeleteSavingsGoalUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new DeleteSavingsGoalUseCase(savingsGoalRepository);
	}

	@Test
	void shouldDeleteOwnedGoal() {
		SavingsGoalEntity goal = new SavingsGoalEntity(
				USER_ID, "Wakacje", new BigDecimal("6000.00"), LocalDate.of(2027, 7, 15), NOW);
		given(savingsGoalRepository.findByIdAndUserId(ID, USER_ID)).willReturn(Optional.of(goal));

		useCase.execute(USER_ID, ID);

		then(savingsGoalRepository).should().delete(goal);
	}

	@Test
	void shouldThrowNotFoundAndDeleteNothingWhenGoalIsMissingOrForeign() {
		given(savingsGoalRepository.findByIdAndUserId(ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> useCase.execute(USER_ID, ID)).isInstanceOf(ResourceNotFoundException.class);

		then(savingsGoalRepository).should(never()).delete(any(SavingsGoalEntity.class));
	}

}
