package pl.saldo.goal.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
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
@Table(name = "savings_goals")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SavingsGoalEntity {

	private static final int AMOUNT_SCALE = 2;

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", nullable = false, updatable = false)
	private Long id;

	@Column(name = "user_id", nullable = false, updatable = false)
	private UUID userId;

	@Column(name = "name", nullable = false, length = 100)
	private String name;

	@Column(name = "target_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal targetAmount;

	@Column(name = "current_amount", nullable = false, precision = 12, scale = 2)
	private BigDecimal currentAmount;

	@Column(name = "target_date", nullable = false)
	private LocalDate targetDate;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public SavingsGoalEntity(UUID userId, String name, BigDecimal targetAmount, LocalDate targetDate, Instant now) {
		this.userId = userId;
		this.name = name.strip();
		this.targetAmount = normalize(targetAmount);
		this.currentAmount = normalize(BigDecimal.ZERO);
		this.targetDate = targetDate;
		this.createdAt = now;
	}

	// The saved progress is not editable here: it changes only through deposits (T-059).
	public void update(String newName, BigDecimal newTargetAmount, LocalDate newTargetDate) {
		this.name = newName.strip();
		this.targetAmount = normalize(newTargetAmount);
		this.targetDate = newTargetDate;
	}

	// The single place that decides the status. It is derived, not stored: an overpayment still means COMPLETED.
	public GoalStatus status() {
		return currentAmount.compareTo(targetAmount) >= 0 ? GoalStatus.COMPLETED : GoalStatus.ACTIVE;
	}

	// The command allows at most 2 decimals, so UNNECESSARY never rounds: it only pads 6000 to 6000.00,
	// which keeps the in-memory value equal to what PostgreSQL stores in DECIMAL(12,2).
	private static BigDecimal normalize(BigDecimal amount) {
		return amount.setScale(AMOUNT_SCALE, RoundingMode.UNNECESSARY);
	}

}
