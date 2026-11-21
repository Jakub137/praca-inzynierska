package pl.saldo.recurring.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import pl.saldo.shared.error.ApiFieldError;

class RecurringPaymentDatesTest {

	private static final LocalDate TODAY = LocalDate.of(2026, 11, 21);

	@Test
	void shouldTakeTodayInBusinessZoneNotInUtc() {
		// 23:30 UTC on 20 November is already 00:30 on 21 November in Warsaw (UTC+1).
		Clock clock = Clock.fixed(Instant.parse("2026-11-20T23:30:00Z"), ZoneOffset.UTC);

		assertThat(RecurringPaymentDates.today(clock)).isEqualTo(TODAY);
	}

	@Test
	void shouldAcceptToday() {
		assertThatCode(() -> RecurringPaymentDates.requireValidNextDueDate(TODAY, TODAY)).doesNotThrowAnyException();
	}

	@Test
	void shouldRejectYesterday() {
		assertThatThrownBy(() -> RecurringPaymentDates.requireValidNextDueDate(TODAY, TODAY.minusDays(1)))
				.isInstanceOfSatisfying(InvalidRecurringPaymentException.class, ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError("nextDueDate",
								"Termin następnej płatności nie może być w przeszłości. Wybierz dzisiejszą lub późniejszą datę.")));
	}

	@Test
	void shouldAcceptLastDayOf2100() {
		assertThatCode(() -> RecurringPaymentDates.requireValidNextDueDate(TODAY, LocalDate.of(2100, 12, 31)))
				.doesNotThrowAnyException();
	}

	@Test
	void shouldRejectDateAfter2100() {
		assertThatThrownBy(() -> RecurringPaymentDates.requireValidNextDueDate(TODAY, LocalDate.of(2101, 1, 1)))
				.isInstanceOfSatisfying(InvalidRecurringPaymentException.class, ex -> assertThat(ex.getFieldErrors())
						.containsExactly(new ApiFieldError("nextDueDate",
								"Termin następnej płatności może przypadać najpóźniej 31.12.2100. Wybierz wcześniejszą datę.")));
	}

}
