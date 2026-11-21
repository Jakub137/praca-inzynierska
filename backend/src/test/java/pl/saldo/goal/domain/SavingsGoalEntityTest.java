package pl.saldo.goal.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.shared.error.ApiFieldError;

class SavingsGoalEntityTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");
	private static final LocalDate DATE = LocalDate.of(2027, 7, 15);
	private static final String TOTAL_TOO_LARGE_MESSAGE =
			"Suma wpłat na ten cel nie może przekroczyć 9 999 999 999,99. Wpisz mniejszą kwotę.";

	@Test
	void shouldAddDepositToCurrentAmountWithScaleTwo() {
		SavingsGoalEntity goal = goal("6000.00", "0.00");

		goal.deposit(new BigDecimal("100"));

		assertThat(goal.getCurrentAmount()).isEqualTo(new BigDecimal("100.00"));
	}

	@Test
	void shouldAccumulateConsecutiveDeposits() {
		SavingsGoalEntity goal = goal("6000.00", "0.00");

		goal.deposit(new BigDecimal("100.00"));
		goal.deposit(new BigDecimal("250.50"));

		assertThat(goal.getCurrentAmount()).isEqualTo(new BigDecimal("350.50"));
		assertThat(goal.status()).isEqualTo(GoalStatus.ACTIVE);
	}

	@Test
	void shouldBecomeCompletedWhenDepositReachesTarget() {
		SavingsGoalEntity goal = goal("6000.00", "4500.00");

		goal.deposit(new BigDecimal("1500.00"));

		assertThat(goal.getCurrentAmount()).isEqualTo(new BigDecimal("6000.00"));
		assertThat(goal.status()).isEqualTo(GoalStatus.COMPLETED);
	}

	@Test
	void shouldAllowOverpaymentAndStayCompleted() {
		SavingsGoalEntity goal = goal("6000.00", "6000.00");

		goal.deposit(new BigDecimal("0.01"));

		assertThat(goal.getCurrentAmount()).isEqualTo(new BigDecimal("6000.01"));
		assertThat(goal.status()).isEqualTo(GoalStatus.COMPLETED);
	}

	@Test
	void shouldAcceptDepositThatReachesMaximumAmountExactly() {
		SavingsGoalEntity goal = goal("6000.00", "9999999999.98");

		goal.deposit(new BigDecimal("0.01"));

		assertThat(goal.getCurrentAmount()).isEqualTo(new BigDecimal("9999999999.99"));
	}

	@Test
	void shouldRejectDepositThatExceedsMaximumAmountAndLeaveCurrentAmountUnchanged() {
		SavingsGoalEntity goal = goal("6000.00", "9999999999.98");

		assertThatThrownBy(() -> goal.deposit(new BigDecimal("0.02")))
				.isInstanceOfSatisfying(InvalidSavingsGoalException.class, ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError("amount", TOTAL_TOO_LARGE_MESSAGE)));

		assertThat(goal.getCurrentAmount()).isEqualTo(new BigDecimal("9999999999.98"));
	}

	private static SavingsGoalEntity goal(String targetAmount, String currentAmount) {
		SavingsGoalEntity goal = new SavingsGoalEntity(USER_ID, "Wakacje", new BigDecimal(targetAmount), DATE, NOW);
		ReflectionTestUtils.setField(goal, "currentAmount", new BigDecimal(currentAmount));
		return goal;
	}

}
