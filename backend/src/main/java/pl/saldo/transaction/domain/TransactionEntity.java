package pl.saldo.transaction.domain;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.currency.domain.SupportedCurrency;

@Entity
@Table(name = "transactions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TransactionEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	@Column(name = "id", nullable = false, updatable = false)
	private UUID id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private UUID userId;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id", nullable = false)
	private CategoryEntity category;

	@Column(name = "amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal amount;

	@Enumerated(EnumType.STRING)
	@Column(name = "currency", nullable = false, length = 3)
	private SupportedCurrency currency;

	@Column(name = "amount_pln", nullable = false, precision = 12, scale = 2)
	private BigDecimal amountPln;

	@Column(name = "exchange_rate", nullable = false, precision = 8, scale = 4)
	private BigDecimal exchangeRate;

	@Column(name = "transaction_date", nullable = false)
	private LocalDate transactionDate;

	@Column(name = "description", length = 100)
	private String description;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false, length = 10)
	private TransactionType type;

	@Column(name = "is_recurring", nullable = false)
	private boolean recurring;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	// A transaction created by the user is never recurring; recurring payments (T-062) will get their own factory.
	public TransactionEntity(
			UUID userId,
			CategoryEntity category,
			BigDecimal amount,
			SupportedCurrency currency,
			BigDecimal amountPln,
			BigDecimal exchangeRate,
			LocalDate transactionDate,
			String description,
			TransactionType type,
			Instant now) {
		this.userId = userId;
		this.category = category;
		this.amount = amount;
		this.currency = currency;
		this.amountPln = amountPln;
		this.exchangeRate = exchangeRate;
		this.transactionDate = transactionDate;
		this.description = description;
		this.type = type;
		this.recurring = false;
		this.createdAt = now;
	}

	// Owner, creation time and the recurring flag never change on edit.
	public void update(
			CategoryEntity category,
			BigDecimal amount,
			SupportedCurrency currency,
			BigDecimal amountPln,
			BigDecimal exchangeRate,
			LocalDate transactionDate,
			String description,
			TransactionType type) {
		this.category = category;
		this.amount = amount;
		this.currency = currency;
		this.amountPln = amountPln;
		this.exchangeRate = exchangeRate;
		this.transactionDate = transactionDate;
		this.description = description;
		this.type = type;
	}

}
