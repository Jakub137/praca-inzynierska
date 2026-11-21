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
import pl.saldo.shared.error.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class UpdateSavingsGoalUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Long ID = 7L;
	// 11:00 on 2026-11-20 in Warsaw.
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");
	private static final LocalDate FUTURE_DATE = LocalDate.of(2027, 7, 15);

	@Mock
	private OwnedSavingsGoalFinder ownedSavingsGoalFinder;

	private UpdateSavingsGoalUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new UpdateSavingsGoalUseCase(ownedSavingsGoalFinder, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	@Test
	void shouldReplaceEditableFieldsAndKeepSavedProgress() {
		SavingsGoalEntity goal = givenGoal(FUTURE_DATE, "1500.00");

		SavingsGoalResponse response = useCase.execute(
				USER_ID, ID, new SavingsGoalCommand("Samochód", new BigDecimal("9000"), LocalDate.of(2027, 11, 20)));

		assertThat(goal.getName()).isEqualTo("Samochód");
		assertThat(goal.getTargetAmount()).isEqualTo(new BigDecimal("9000.00"));
		assertThat(goal.getTargetDate()).isEqualTo(LocalDate.of(2027, 11, 20));
		assertThat(goal.getCurrentAmount()).isEqualTo(new BigDecimal("1500.00"));
		assertThat(response).isEqualTo(new SavingsGoalResponse(
				ID, "Samochód", new BigDecimal("9000.00"), new BigDecimal("1500.00"), LocalDate.of(2027, 11, 20),
				GoalStatus.ACTIVE, 12, new BigDecimal("625.00")));
		then(ownedSavingsGoalFinder).should().findOwnedForUpdate(ID, USER_ID);
		then(ownedSavingsGoalFinder).shouldHaveNoMoreInteractions();
	}

	@Test
	void shouldNotCheckDeadlineWhenItIsUnchangedSoPastGoalCanBeRenamed() {
		LocalDate passedDate = LocalDate.of(2026, 10, 1);
		SavingsGoalEntity goal = givenGoal(passedDate, "0.00");

		SavingsGoalResponse response = useCase.execute(
				USER_ID, ID, new SavingsGoalCommand("Nowa nazwa", new BigDecimal("6000.00"), passedDate));

		assertThat(goal.getName()).isEqualTo("Nowa nazwa");
		assertThat(response.monthsRemaining()).isZero();
		assertThat(response.monthlyContribution()).isEqualTo(new BigDecimal("6000.00"));
		assertThat(response.status()).isEqualTo(GoalStatus.ACTIVE);
	}

	@Test
	void shouldRejectChangedDeadlineThatIsNotInFutureAndLeaveGoalUnchanged() {
		SavingsGoalEntity goal = givenGoal(FUTURE_DATE, "0.00");
		SavingsGoalCommand command = new SavingsGoalCommand("Zmiana", new BigDecimal("1.00"), LocalDate.of(2026, 11, 20));

		assertThatThrownBy(() -> useCase.execute(USER_ID, ID, command)).isInstanceOf(InvalidSavingsGoalException.class);

		assertThat(goal.getName()).isEqualTo("Wakacje");
		assertThat(goal.getTargetAmount()).isEqualTo(new BigDecimal("6000.00"));
		assertThat(goal.getTargetDate()).isEqualTo(FUTURE_DATE);
	}

	@Test
	void shouldReturnCompletedWhenTargetIsLoweredBelowSavedAmount() {
		givenGoal(FUTURE_DATE, "4500.00");

		SavingsGoalResponse response = useCase.execute(
				USER_ID, ID, new SavingsGoalCommand("Wakacje", new BigDecimal("4000.00"), FUTURE_DATE));

		assertThat(response.status()).isEqualTo(GoalStatus.COMPLETED);
		assertThat(response.monthlyContribution()).isEqualTo(new BigDecimal("0.00"));
	}

	@Test
	void shouldReturnCompletedWhenTargetEqualsSavedAmount() {
		givenGoal(FUTURE_DATE, "4500.00");

		SavingsGoalResponse response = useCase.execute(
				USER_ID, ID, new SavingsGoalCommand("Wakacje", new BigDecimal("4500.00"), FUTURE_DATE));

		assertThat(response.status()).isEqualTo(GoalStatus.COMPLETED);
	}

	@Test
	void shouldThrowNotFoundWhenGoalIsMissingOrForeign() {
		given(ownedSavingsGoalFinder.findOwnedForUpdate(ID, USER_ID))
				.willThrow(new ResourceNotFoundException("Savings goal not found: " + ID));
		SavingsGoalCommand command = new SavingsGoalCommand("Cel", new BigDecimal("1.00"), FUTURE_DATE);

		assertThatThrownBy(() -> useCase.execute(USER_ID, ID, command)).isInstanceOf(ResourceNotFoundException.class);
	}

	private SavingsGoalEntity givenGoal(LocalDate targetDate, String currentAmount) {
		SavingsGoalEntity goal = new SavingsGoalEntity(USER_ID, "Wakacje", new BigDecimal("6000.00"), targetDate, NOW);
		ReflectionTestUtils.setField(goal, "id", ID);
		ReflectionTestUtils.setField(goal, "currentAmount", new BigDecimal(currentAmount));
		given(ownedSavingsGoalFinder.findOwnedForUpdate(ID, USER_ID)).willReturn(goal);
		return goal;
	}

}
