package pl.saldo.budget.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "budget_limits")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BudgetLimitEntity {

	private static final int AMOUNT_SCALE = 2;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", nullable = false, updatable = false)
	private Long id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private UUID userId;

	@Column(name = "category_id", nullable = false, updatable = false)
	private Long categoryId;

	@Column(name = "month", nullable = false, updatable = false)
	private int month;

	@Column(name = "year", nullable = false, updatable = false)
	private int year;

	@Column(name = "limit_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal limitAmount;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public BudgetLimitEntity(UUID userId, Long categoryId, int month, int year, BigDecimal limitAmount, Instant now) {
		this.userId = userId;
		this.categoryId = categoryId;
		this.month = month;
		this.year = year;
		this.limitAmount = normalize(limitAmount);
		this.createdAt = now;
	}

	// Owner, category, month and year form the unique key and never change: only the amount is editable.
	public void changeLimitAmount(BigDecimal newLimitAmount) {
		this.limitAmount = normalize(newLimitAmount);
	}

	// The command allows at most 2 decimals, so UNNECESSARY never rounds: it only pads 1500 to 1500.00,
	// which keeps the in-memory value equal to what PostgreSQL stores in DECIMAL(12,2).
	private static BigDecimal normalize(BigDecimal amount) {
		return amount.setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY);
	}

}
