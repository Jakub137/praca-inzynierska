package pl.saldo.transaction.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import pl.saldo.shared.error.ApiFieldError;
import pl.saldo.transaction.domain.InvalidTransactionQueryException;
import pl.saldo.transaction.domain.TransactionType;

class GetTransactionsQueryTest {

	private static final LocalDate FROM = LocalDate.of(2026, 11, 1);
	private static final LocalDate TO = LocalDate.of(2026, 11, 30);

	@Test
	void shouldUseDefaultsWhenNoParametersAreGiven() {
		GetTransactionsQuery query = GetTransactionsQuery.of(null, null, null, null, null, null, null, null);

		assertThat(query.page()).isEqualTo(GetTransactionsQuery.DEFAULT_PAGE);
		assertThat(query.size()).isEqualTo(GetTransactionsQuery.DEFAULT_SIZE);
		assertThat(query.sortBy()).isEqualTo(TransactionSortField.DATE);
		assertThat(query.sortDirection()).isEqualTo(Sort.Direction.DESC);
		assertThat(query.categoryId()).isNull();
		assertThat(query.type()).isNull();
		assertThat(query.dateFrom()).isNull();
		assertThat(query.dateTo()).isNull();
	}

	@Test
	void shouldKeepAllGivenParametersAndIgnoreDirectionCase() {
		GetTransactionsQuery query = GetTransactionsQuery.of(
				2, 50, "amountPln", "ASC", 5L, TransactionType.EXPENSE, FROM, TO);

		assertThat(query).isEqualTo(new GetTransactionsQuery(
				2, 50, TransactionSortField.AMOUNT_PLN, Sort.Direction.ASC, 5L, TransactionType.EXPENSE, FROM, TO));
	}

	@Test
	void shouldAcceptSizeBoundsAndEqualDates() {
		assertThat(GetTransactionsQuery.of(0, GetTransactionsQuery.MIN_SIZE, null, null, null, null, FROM, FROM).size())
				.isEqualTo(1);
		assertThat(GetTransactionsQuery.of(0, GetTransactionsQuery.MAX_SIZE, null, null, null, null, FROM, FROM).size())
				.isEqualTo(100);
	}

	@Test
	void shouldRejectSizeBelowMinimum() {
		assertRejected(() -> GetTransactionsQuery.of(null, 0, null, null, null, null, null, null),
				new ApiFieldError("size", "Rozmiar strony musi mieścić się w przedziale od 1 do 100"));
	}

	@Test
	void shouldRejectSizeAboveMaximum() {
		assertRejected(() -> GetTransactionsQuery.of(null, 101, null, null, null, null, null, null),
				new ApiFieldError("size", "Rozmiar strony musi mieścić się w przedziale od 1 do 100"));
	}

	@Test
	void shouldRejectNegativePage() {
		assertRejected(() -> GetTransactionsQuery.of(-1, null, null, null, null, null, null, null),
				new ApiFieldError("page", "Numer strony nie może być ujemny"));
	}

	@Test
	void shouldRejectSortFieldOutsideWhitelist() {
		assertRejected(() -> GetTransactionsQuery.of(null, null, "password", null, null, null, null, null),
				new ApiFieldError("sortBy", "Sortowanie jest możliwe tylko po polach: date, amountPln, createdAt"));
	}

	@Test
	void shouldRejectSortFieldWithDifferentCase() {
		assertRejected(() -> GetTransactionsQuery.of(null, null, "DATE", null, null, null, null, null),
				new ApiFieldError("sortBy", "Sortowanie jest możliwe tylko po polach: date, amountPln, createdAt"));
	}

	@Test
	void shouldRejectUnknownSortDirection() {
		assertRejected(() -> GetTransactionsQuery.of(null, null, null, "sideways", null, null, null, null),
				new ApiFieldError("sortDirection", "Kierunek sortowania musi mieć wartość asc albo desc"));
	}

	@Test
	void shouldRejectDateFromAfterDateTo() {
		assertRejected(() -> GetTransactionsQuery.of(null, null, null, null, null, null, TO, FROM),
				new ApiFieldError("dateFrom", "Data początkowa nie może być późniejsza niż data końcowa"));
	}

	@Test
	void shouldReportAllInvalidParametersTogether() {
		assertRejected(() -> GetTransactionsQuery.of(null, 0, "password", "sideways", null, null, null, null),
				new ApiFieldError("size", "Rozmiar strony musi mieścić się w przedziale od 1 do 100"),
				new ApiFieldError("sortBy", "Sortowanie jest możliwe tylko po polach: date, amountPln, createdAt"),
				new ApiFieldError("sortDirection", "Kierunek sortowania musi mieć wartość asc albo desc"));
	}

	@Test
	void shouldSortByDateThenNewestCreatedThenIdByDefault() {
		Pageable pageable = GetTransactionsQuery.of(null, null, null, null, null, null, null, null).toPageable();

		assertThat(pageable.getPageNumber()).isZero();
		assertThat(pageable.getPageSize()).isEqualTo(20);
		assertThat(pageable.getSort().toList()).containsExactly(
				Sort.Order.desc("transactionDate"), Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
	}

	@Test
	void shouldMapAmountPlnAscendingWithTieBreakers() {
		Pageable pageable = GetTransactionsQuery.of(3, 10, "amountPln", "asc", null, null, null, null).toPageable();

		assertThat(pageable.getPageNumber()).isEqualTo(3);
		assertThat(pageable.getPageSize()).isEqualTo(10);
		assertThat(pageable.getSort().toList()).containsExactly(
				Sort.Order.asc("amountPln"), Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
	}

	@Test
	void shouldNotRepeatCreatedAtWhenSortingByIt() {
		Pageable pageable = GetTransactionsQuery.of(null, null, "createdAt", "asc", null, null, null, null).toPageable();

		assertThat(pageable.getSort().toList()).containsExactly(Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
	}

	private static void assertRejected(ThrowingCallable call, ApiFieldError... expected) {
		assertThatThrownBy(call).isInstanceOfSatisfying(
				InvalidTransactionQueryException.class,
				exception -> assertThat(exception.getFieldErrors()).containsExactly(expected));
	}

}
