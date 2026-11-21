package pl.saldo.goal.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.goal.api.SavingsGoalResponse;
import pl.saldo.goal.domain.GoalStatus;
import pl.saldo.goal.domain.InvalidSavingsGoalException;
import pl.saldo.goal.domain.SavingsGoalEntity;
import pl.saldo.shared.error.ApiFieldError;
import pl.saldo.shared.error.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class DepositToGoalUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Long ID = 7L;
	// 11:00 on 2026-11-20 in Warsaw.
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");
	private static final LocalDate TARGET_DATE = LocalDate.of(2027, 7, 15);

	@Mock
	private OwnedSavingsGoalFinder ownedSavingsGoalFinder;

	private DepositToGoalUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new DepositToGoalUseCase(ownedSavingsGoalFinder, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	@Test
	void shouldIncreaseCurrentAmountAndReturnRecalculatedGoal() {
		SavingsGoalEntity goal = givenGoal("1500.00");

		SavingsGoalResponse response = useCase.execute(USER_ID, ID, new DepositToGoalCommand(new BigDecimal("500")));

		assertThat(goal.getCurrentAmount()).isEqualTo(new BigDecimal("2000.00"));
		assertThat(response).isEqualTo(new SavingsGoalResponse(
				ID, "Wakacje", new BigDecimal("6000.00"), new BigDecimal("2000.00"), TARGET_DATE,
				GoalStatus.ACTIVE, 7, new BigDecimal("571.43")));
		then(ownedSavingsGoalFinder).should().findOwnedForUpdate(ID, USER_ID);
		then(ownedSavingsGoalFinder).shouldHaveNoMoreInteractions();
	}

	@Test
	void shouldReportCompletedWhenDepositReachesTarget() {
		givenGoal("4500.00");

		SavingsGoalResponse response = useCase.execute(USER_ID, ID, new DepositToGoalCommand(new BigDecimal("1500.00")));

		assertThat(response.status()).isEqualTo(GoalStatus.COMPLETED);
		assertThat(response.currentAmount()).isEqualTo(new BigDecimal("6000.00"));
		assertThat(response.monthlyContribution()).isEqualTo(new BigDecimal("0.00"));
	}

	@Test
	void shouldAllowOverpaymentAndReportCompleted() {
		givenGoal("5000.00");

		SavingsGoalResponse response = useCase.execute(USER_ID, ID, new DepositToGoalCommand(new BigDecimal("2000.00")));

		assertThat(response.status()).isEqualTo(GoalStatus.COMPLETED);
		assertThat(response.currentAmount()).isEqualTo(new BigDecimal("7000.00"));
	}

	@Test
	void shouldRejectDepositThatOverflowsTotalAndLeaveGoalUnchanged() {
		SavingsGoalEntity goal = givenGoal("9999999999.98");
		DepositToGoalCommand command = new DepositToGoalCommand(new BigDecimal("0.02"));

		assertThatThrownBy(() -> useCase.execute(USER_ID, ID, command))
				.isInstanceOfSatisfying(InvalidSavingsGoalException.class,
						ex -> assertThat(ex.getFieldErrors()).extracting(ApiFieldError::field).containsExactly("amount"));

		assertThat(goal.getCurrentAmount()).isEqualTo(new BigDecimal("9999999999.98"));
		then(ownedSavingsGoalFinder).should().findOwnedForUpdate(ID, USER_ID);
		then(ownedSavingsGoalFinder).shouldHaveNoMoreInteractions();
	}

	@Test
	void shouldThrowNotFoundWhenGoalIsMissingOrForeign() {
		given(ownedSavingsGoalFinder.findOwnedForUpdate(ID, USER_ID))
				.willThrow(new ResourceNotFoundException("Savings goal not found: " + ID));
		DepositToGoalCommand command = new DepositToGoalCommand(new BigDecimal("10.00"));

		assertThatThrownBy(() -> useCase.execute(USER_ID, ID, command)).isInstanceOf(ResourceNotFoundException.class);
	}

	private SavingsGoalEntity givenGoal(String currentAmount) {
		SavingsGoalEntity goal = new SavingsGoalEntity(USER_ID, "Wakacje", new BigDecimal("6000.00"), TARGET_DATE, NOW);
		ReflectionTestUtils.setField(goal, "id", ID);
		ReflectionTestUtils.setField(goal, "currentAmount", new BigDecimal(currentAmount));
		given(ownedSavingsGoalFinder.findOwnedForUpdate(ID, USER_ID)).willReturn(goal);
		return goal;
	}

}
