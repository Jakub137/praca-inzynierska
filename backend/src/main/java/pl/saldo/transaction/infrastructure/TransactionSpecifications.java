package pl.saldo.transaction.infrastructure;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.jpa.domain.PredicateSpecification;
import org.springframework.data.jpa.domain.Specification;

import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;

public final class TransactionSpecifications {

	private static final String USER_ID = "userId";
	private static final String CATEGORY = "category";
	private static final String ID = "id";
	private static final String TYPE = "type";
	private static final String TRANSACTION_DATE = "transactionDate";

	private TransactionSpecifications() {
	}

	// The owner condition is always present, so a list can never contain another user's transactions.
	// Every other filter is added only when its parameter is not null; both date bounds are inclusive.
	public static Specification<TransactionEntity> matching(
			UUID userId, Long categoryId, TransactionType type, LocalDate dateFrom, LocalDate dateTo) {
		Specification<TransactionEntity> specification = Specification.where(belongsTo(userId));
		if (categoryId != null) {
			specification = specification.and(inCategory(categoryId));
		}
		if (type != null) {
			specification = specification.and(hasType(type));
		}
		if (dateFrom != null) {
			specification = specification.and(dateOnOrAfter(dateFrom));
		}
		if (dateTo != null) {
			specification = specification.and(dateOnOrBefore(dateTo));
		}
		return specification;
	}

	private static PredicateSpecification<TransactionEntity> belongsTo(UUID userId) {
		return (from, builder) -> builder.equal(from.get(USER_ID), userId);
	}

	private static PredicateSpecification<TransactionEntity> inCategory(Long categoryId) {
		return (from, builder) -> builder.equal(from.get(CATEGORY).get(ID), categoryId);
	}

	private static PredicateSpecification<TransactionEntity> hasType(TransactionType type) {
		return (from, builder) -> builder.equal(from.get(TYPE), type);
	}

	private static PredicateSpecification<TransactionEntity> dateOnOrAfter(LocalDate dateFrom) {
		return (from, builder) -> builder.greaterThanOrEqualTo(from.<LocalDate>get(TRANSACTION_DATE), dateFrom);
	}

	private static PredicateSpecification<TransactionEntity> dateOnOrBefore(LocalDate dateTo) {
		return (from, builder) -> builder.lessThanOrEqualTo(from.<LocalDate>get(TRANSACTION_DATE), dateTo);
	}

}
