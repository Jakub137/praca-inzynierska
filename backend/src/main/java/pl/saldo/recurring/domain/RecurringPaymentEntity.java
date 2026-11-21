package pl.saldo.recurring.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
@Table(name = "recurring_payments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecurringPaymentEntity {

	private static final int AMOUNT_SCALE = 2;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", nullable = false, updatable = false)
	private Long id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private UUID userId;

	@Column(name = "name", nullable = false, length = 100)
	private String name;

	@Column(name = "amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal amount;

	@Enumerated(EnumType.STRING)
	@Column(name = "currency", nullable = false, length = 3)
	private SupportedCurrency currency;

	@Enumerated(EnumType.STRING)
	@Column(name = "frequency", nullable = false, length = 20)
	private PaymentFrequency frequency;

	@Column(name = "next_due_date", nullable = false)
	private LocalDate nextDueDate;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "category_id", nullable = false)
	private CategoryEntity category;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public RecurringPaymentEntity(
			UUID userId,
			String name,
			BigDecimal amount,
			SupportedCurrency currency,
			PaymentFrequency frequency,
			LocalDate nextDueDate,
			CategoryEntity category,
			Instant now) {
		this.userId = userId;
		this.name = name.strip();
		this.amount = normalize(amount);
		this.currency = currency;
		this.frequency = frequency;
		this.nextDueDate = nextDueDate;
		this.category = category;
		this.createdAt = now;
	}

	// The command allows at most 2 decimals, so UNNECESSARY never rounds: it only pads 43 to 43.00,
	// which keeps the in-memory value equal to what PostgreSQL stores in DECIMAL(12,2).
	private static BigDecimal normalize(BigDecimal amount) {
		return amount.setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY);
	}

}
