package pl.saldo.transaction.usecase;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import pl.saldo.shared.error.ApiFieldError;
import pl.saldo.transaction.domain.InvalidTransactionQueryException;
import pl.saldo.transaction.domain.TransactionType;

public record GetTransactionsQuery(
		int page,
		int size,
		TransactionSortField sortBy,
		Sort.Direction sortDirection,
		Long categoryId,
		TransactionType type,
		LocalDate dateFrom,
		LocalDate dateTo) {

	public static final int DEFAULT_PAGE = 0;
	public static final int DEFAULT_SIZE = 20;
	public static final int MIN_SIZE = 1;
	public static final int MAX_SIZE = 100;

	private static final TransactionSortField DEFAULT_SORT_BY = TransactionSortField.DATE;
	private static final Sort.Direction DEFAULT_SORT_DIRECTION = Sort.Direction.DESC;
	private static final String ASCENDING = "asc";
	private static final String DESCENDING = "desc";
	private static final String ID_PROPERTY = "id";

	// Missing parameters get defaults; every invalid parameter is reported at once and never silently replaced.
	public static GetTransactionsQuery of(Integer page, Integer size, String sortBy, String sortDirection,
			Long categoryId, TransactionType type, LocalDate dateFrom, LocalDate dateTo) {
		List<ApiFieldError> errors = new ArrayList<>();
		int resolvedPage = resolvePage(page, errors);
		int resolvedSize = resolveSize(size, errors);
		TransactionSortField resolvedSortBy = resolveSortBy(sortBy, errors);
		Sort.Direction resolvedDirection = resolveDirection(sortDirection, errors);
		validateDateRange(dateFrom, dateTo, errors);
		if (!errors.isEmpty()) {
			throw new InvalidTransactionQueryException(errors);
		}
		return new GetTransactionsQuery(
				resolvedPage, resolvedSize, resolvedSortBy, resolvedDirection, categoryId, type, dateFrom, dateTo);
	}

	public Pageable toPageable() {
		return PageRequest.of(page, size, toSort());
	}

	// Ties are broken by newest creation time and then by id, so pages never overlap or skip rows.
	private Sort toSort() {
		Sort sort = Sort.by(sortDirection, sortBy.property());
		if (sortBy != TransactionSortField.CREATED_AT) {
			sort = sort.and(Sort.by(Sort.Direction.DESC, TransactionSortField.CREATED_AT.property()));
		}
		return sort.and(Sort.by(Sort.Direction.ASC, ID_PROPERTY));
	}

	private static int resolvePage(Integer page, List<ApiFieldError> errors) {
		if (page == null) {
			return DEFAULT_PAGE;
		}
		if (page < 0) {
			errors.add(new ApiFieldError("page", "Numer strony nie może być ujemny"));
			return DEFAULT_PAGE;
		}
		return page;
	}

	private static int resolveSize(Integer size, List<ApiFieldError> errors) {
		if (size == null) {
			return DEFAULT_SIZE;
		}
		if (size < MIN_SIZE || size > MAX_SIZE) {
			errors.add(new ApiFieldError("size",
					"Rozmiar strony musi mieścić się w przedziale od " + MIN_SIZE + " do " + MAX_SIZE));
			return DEFAULT_SIZE;
		}
		return size;
	}

	private static TransactionSortField resolveSortBy(String sortBy, List<ApiFieldError> errors) {
		if (sortBy == null) {
			return DEFAULT_SORT_BY;
		}
		Optional<TransactionSortField> field = TransactionSortField.fromParameter(sortBy);
		if (field.isPresent()) {
			return field.get();
		}
		String allowed = Arrays.stream(TransactionSortField.values())
				.map(TransactionSortField::parameterValue)
				.collect(Collectors.joining(", "));
		errors.add(new ApiFieldError("sortBy", "Sortowanie jest możliwe tylko po polach: " + allowed));
		return DEFAULT_SORT_BY;
	}

	private static Sort.Direction resolveDirection(String sortDirection, List<ApiFieldError> errors) {
		if (sortDirection == null) {
			return DEFAULT_SORT_DIRECTION;
		}
		if (sortDirection.equalsIgnoreCase(ASCENDING)) {
			return Sort.Direction.ASC;
		}
		if (sortDirection.equalsIgnoreCase(DESCENDING)) {
			return Sort.Direction.DESC;
		}
		errors.add(new ApiFieldError("sortDirection",
				"Kierunek sortowania musi mieć wartość " + ASCENDING + " albo " + DESCENDING));
		return DEFAULT_SORT_DIRECTION;
	}

	private static void validateDateRange(LocalDate dateFrom, LocalDate dateTo, List<ApiFieldError> errors) {
		if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
			errors.add(new ApiFieldError("dateFrom", "Data początkowa nie może być późniejsza niż data końcowa"));
		}
	}

}
