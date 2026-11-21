package pl.saldo.goal.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
class OwnedSavingsGoalFinderTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Long ID = 7L;
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");

	@Mock
	private SavingsGoalRepository savingsGoalRepository;

	private OwnedSavingsGoalFinder finder;

	@BeforeEach
	void setUp() {
		finder = new OwnedSavingsGoalFinder(savingsGoalRepository);
	}

	@Test
	void shouldReturnOwnedGoalWithoutLocking() {
		SavingsGoalEntity goal = goal();
		given(savingsGoalRepository.findByIdAndUserId(ID, USER_ID)).willReturn(Optional.of(goal));

		assertThat(finder.findOwned(ID, USER_ID)).isSameAs(goal);

		then(savingsGoalRepository).should(never()).findForUpdateByIdAndUserId(ID, USER_ID);
	}

	@Test
	void shouldReturnOwnedGoalThroughLockingQuery() {
		SavingsGoalEntity goal = goal();
		given(savingsGoalRepository.findForUpdateByIdAndUserId(ID, USER_ID)).willReturn(Optional.of(goal));

		assertThat(finder.findOwnedForUpdate(ID, USER_ID)).isSameAs(goal);

		then(savingsGoalRepository).should(never()).findByIdAndUserId(ID, USER_ID);
	}

	@Test
	void shouldThrowNotFoundWhenGoalIsMissingOrForeign() {
		given(savingsGoalRepository.findByIdAndUserId(ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> finder.findOwned(ID, USER_ID))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessage("Savings goal not found: 7");
	}

	@Test
	void shouldThrowNotFoundFromLockingQueryWhenGoalIsMissingOrForeign() {
		given(savingsGoalRepository.findForUpdateByIdAndUserId(ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> finder.findOwnedForUpdate(ID, USER_ID))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessage("Savings goal not found: 7");
	}

	private static SavingsGoalEntity goal() {
		return new SavingsGoalEntity(USER_ID, "Wakacje", new BigDecimal("6000.00"), LocalDate.of(2027, 7, 15), NOW);
	}

}
