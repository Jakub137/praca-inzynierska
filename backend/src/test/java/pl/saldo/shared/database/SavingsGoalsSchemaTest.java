package pl.saldo.shared.database;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class SavingsGoalsSchemaTest {

	private static final String GOAL_NAME = "Wakacje";
	private static final int MAX_NAME_LENGTH = 100;
	private static final String TARGET_AMOUNT = "1000.00";
	private static final String ZERO_AMOUNT = "0.00";
	private static final LocalDate FUTURE_DATE = LocalDate.of(2030, 6, 1);
	private static final LocalDate PAST_DATE = LocalDate.of(2020, 1, 1);

	private final EntityManager entityManager;

	@Autowired
	SavingsGoalsSchemaTest(EntityManager entityManager) {
		this.entityManager = entityManager;
	}

	@Test
	void shouldApplyColumnDefaults() {
		UUID userId = insertUser();
		entityManager.createNativeQuery(
				"INSERT INTO savings_goals (user_id, name, target_amount, target_date) "
						+ "VALUES (?1, ?2, ?3, ?4)")
				.setParameter(1, userId)
				.setParameter(2, GOAL_NAME)
				.setParameter(3, new BigDecimal(TARGET_AMOUNT))
				.setParameter(4, FUTURE_DATE)
				.executeUpdate();

		assertThat(scalar("SELECT current_amount = 0 FROM savings_goals WHERE user_id = ?1", userId))
				.isEqualTo(true);
		assertThat(scalar("SELECT created_at IS NOT NULL FROM savings_goals WHERE user_id = ?1", userId))
				.isEqualTo(true);
	}

	@Test
	void shouldRejectNonPositiveTargetAmount() {
		UUID userId = insertUser();

		assertThatThrownBy(() -> insertGoal(userId, GOAL_NAME, ZERO_AMOUNT, ZERO_AMOUNT, FUTURE_DATE))
				.rootCause().hasMessageContaining("chk_savings_goals_target_amount_positive");
	}

	@Test
	void shouldRejectNegativeCurrentAmount() {
		UUID userId = insertUser();

		assertThatThrownBy(() -> insertGoal(userId, GOAL_NAME, TARGET_AMOUNT, "-0.01", FUTURE_DATE))
				.rootCause().hasMessageContaining("chk_savings_goals_current_amount_non_negative");
	}

	@Test
	void shouldAllowCurrentAmountAboveTargetAmount() {
		UUID userId = insertUser();
		insertGoal(userId, GOAL_NAME, "100.00", "150.00", FUTURE_DATE);

		assertThat(count("SELECT count(*) FROM savings_goals WHERE user_id = ?1", userId)).isEqualTo(1);
	}

	@Test
	void shouldAllowTargetDateInThePast() {
		UUID userId = insertUser();
		insertGoal(userId, GOAL_NAME, TARGET_AMOUNT, ZERO_AMOUNT, PAST_DATE);

		assertThat(count("SELECT count(*) FROM savings_goals WHERE user_id = ?1", userId)).isEqualTo(1);
	}

	@Test
	void shouldRejectMissingTargetDate() {
		UUID userId = insertUser();

		assertThatThrownBy(() -> entityManager.createNativeQuery(
				"INSERT INTO savings_goals (user_id, name, target_amount, target_date) "
						+ "VALUES (?1, ?2, ?3, NULL)")
				.setParameter(1, userId)
				.setParameter(2, GOAL_NAME)
				.setParameter(3, new BigDecimal(TARGET_AMOUNT))
				.executeUpdate())
				.rootCause().hasMessageContaining("target_date");
	}

	@Test
	void shouldRejectNameLongerThanHundredCharacters() {
		UUID userId = insertUser();
		String tooLongName = "x".repeat(MAX_NAME_LENGTH + 1);

		assertThatThrownBy(() -> insertGoal(userId, tooLongName, TARGET_AMOUNT, ZERO_AMOUNT, FUTURE_DATE))
				.rootCause().hasMessageContaining("character varying(100)");
	}

	@Test
	void shouldDeleteGoalsTogetherWithUser() {
		UUID userId = insertUser();
		insertGoal(userId, GOAL_NAME, TARGET_AMOUNT, ZERO_AMOUNT, FUTURE_DATE);

		int deleted = entityManager.createNativeQuery("DELETE FROM users WHERE id = ?1")
				.setParameter(1, userId)
				.executeUpdate();

		assertThat(deleted).isEqualTo(1);
		assertThat(count("SELECT count(*) FROM savings_goals WHERE user_id = ?1", userId)).isZero();
	}

	private UUID insertUser() {
		UUID id = UUID.randomUUID();
		entityManager.createNativeQuery(
				"INSERT INTO users (id, email, password_hash, first_name, last_name) "
						+ "VALUES (?1, ?2, 'hash', 'Jan', 'Kowalski')")
				.setParameter(1, id)
				.setParameter(2, id + "@example.com")
				.executeUpdate();
		return id;
	}

	private void insertGoal(UUID userId, String name, String targetAmount, String currentAmount,
			LocalDate targetDate) {
		entityManager.createNativeQuery(
				"INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date) "
						+ "VALUES (?1, ?2, ?3, ?4, ?5)")
				.setParameter(1, userId)
				.setParameter(2, name)
				.setParameter(3, new BigDecimal(targetAmount))
				.setParameter(4, new BigDecimal(currentAmount))
				.setParameter(5, targetDate)
				.executeUpdate();
	}

	private Object scalar(String sql, Object parameter) {
		return entityManager.createNativeQuery(sql).setParameter(1, parameter).getSingleResult();
	}

	private long count(String sql, Object parameter) {
		return ((Number) scalar(sql, parameter)).longValue();
	}

}
