package pl.saldo.goal.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import pl.saldo.shared.error.ApiFieldError;

class SavingsGoalDatesTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 11, 21);

	@Test
	void shouldTakeTodayInBusinessZoneNotInUtc() {
		// 23:30 UTC on 20 November is already 00:30 on 21 November in Warsaw (UTC+1).
		Clock clock = Clock.fixed(Instant.parse("2026-11-20T23:30:00Z"), ZoneOffset.UTC);

		assertThat(SavingsGoalDates.today(clock)).isEqualTo(TODAY);
	}

	@Test
	void shouldAcceptTomorrow() {
		assertThatCode(() -> SavingsGoalDates.requireValidTargetDate(TODAY, TODAY.plusDays(1))).doesNotThrowAnyException();
	}

	@Test
	void shouldRejectToday() {
		assertThatThrownBy(() -> SavingsGoalDates.requireValidTargetDate(TODAY, TODAY))
				.isInstanceOfSatisfying(InvalidSavingsGoalException.class, ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError("targetDate",
								"Termin celu musi być w przyszłości. Wybierz datę późniejszą niż dzisiejsza.")));
	}

	@Test
	void shouldRejectPastDate() {
		assertThatThrownBy(() -> SavingsGoalDates.requireValidTargetDate(TODAY, TODAY.minusDays(1)))
				.isInstanceOf(InvalidSavingsGoalException.class);
	}

	@Test
	void shouldAcceptLastDayOf2100() {
		assertThatCode(() -> SavingsGoalDates.requireValidTargetDate(TODAY, LocalDate.of(2100, 12, 31)))
				.doesNotThrowAnyException();
	}

	@Test
	void shouldRejectDeadlineAfter2100() {
		assertThatThrownBy(() -> SavingsGoalDates.requireValidTargetDate(TODAY, LocalDate.of(2101, 1, 1)))
				.isInstanceOfSatisfying(InvalidSavingsGoalException.class, ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError("targetDate",
								"Termin celu może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.")));
	}

}
