package pl.saldo.shared.database;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
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
class BudgetLimitsSchemaTest {

	private static final String EXPENSE = "EXPENSE";
	private static final String PLN = "PLN";
	private static final String CATEGORY_NAME = "Hobby";
	private static final String LIMIT_AMOUNT = "500.00";
	private static final int YEAR = 2026;
	private static final int JUNE = 6;

	private final EntityManager entityManager;

	@Autowired
	BudgetLimitsSchemaTest(EntityManager entityManager) {
		this.entityManager = entityManager;
	}

	@Test
	void shouldApplyColumnDefaults() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertLimit(userId, categoryId, JUNE, YEAR, LIMIT_AMOUNT);

		assertThat(scalar("SELECT created_at IS NOT NULL FROM budget_limits WHERE user_id = ?1", userId))
				.isEqualTo(true);
	}

	@Test
	void shouldRejectMonthBelowOne() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);

		assertThatThrownBy(() -> insertLimit(userId, categoryId, 0, YEAR, LIMIT_AMOUNT))
				.rootCause().hasMessageContaining("chk_budget_limits_month");
	}

	@Test
	void shouldRejectMonthAboveTwelve() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);

		assertThatThrownBy(() -> insertLimit(userId, categoryId, 13, YEAR, LIMIT_AMOUNT))
				.rootCause().hasMessageContaining("chk_budget_limits_month");
	}

	@Test
	void shouldRejectNonPositiveLimitAmount() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);

		assertThatThrownBy(() -> insertLimit(userId, categoryId, JUNE, YEAR, "0.00"))
				.rootCause().hasMessageContaining("chk_budget_limits_limit_amount_positive");
	}

	@Test
	void shouldRejectDuplicateLimitForSameCategoryAndMonth() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertLimit(userId, categoryId, JUNE, YEAR, LIMIT_AMOUNT);

		assertThatThrownBy(() -> insertLimit(userId, categoryId, JUNE, YEAR, "100.00"))
				.rootCause().hasMessageContaining("uq_budget_limits_user_year_month_category");
	}

	@Test
	void shouldAllowSameCategoryInDifferentMonthAndYear() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertLimit(userId, categoryId, JUNE, YEAR, LIMIT_AMOUNT);
		insertLimit(userId, categoryId, JUNE + 1, YEAR, LIMIT_AMOUNT);
		insertLimit(userId, categoryId, JUNE, YEAR + 1, LIMIT_AMOUNT);

		assertThat(count("SELECT count(*) FROM budget_limits WHERE user_id = ?1", userId)).isEqualTo(3);
	}

	@Test
	void shouldDeleteLimitsTogetherWithCategoryWithoutTransactions() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertLimit(userId, categoryId, JUNE, YEAR, LIMIT_AMOUNT);

		int deleted = entityManager.createNativeQuery("DELETE FROM categories WHERE id = ?1")
				.setParameter(1, categoryId)
				.executeUpdate();

		assertThat(deleted).isEqualTo(1);
		assertThat(count("SELECT count(*) FROM budget_limits WHERE user_id = ?1", userId)).isZero();
	}

	@Test
	void shouldDeleteLimitsTogetherWithUser() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertLimit(userId, categoryId, JUNE, YEAR, LIMIT_AMOUNT);

		int deleted = entityManager.createNativeQuery("DELETE FROM users WHERE id = ?1")
				.setParameter(1, userId)
				.executeUpdate();

		assertThat(deleted).isEqualTo(1);
		assertThat(count("SELECT count(*) FROM budget_limits WHERE user_id = ?1", userId)).isZero();
	}

	@Test
	void shouldRejectDeletingCategoryUsedByTransactionEvenWhenLimitExists() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertLimit(userId, categoryId, JUNE, YEAR, LIMIT_AMOUNT);
		insertTransaction(userId, categoryId);

		assertThatThrownBy(() -> entityManager.createNativeQuery("DELETE FROM categories WHERE id = ?1")
				.setParameter(1, categoryId)
				.executeUpdate())
				.rootCause().hasMessageContaining("fk_transactions_category");
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

	private long insertCategory(UUID userId) {
		entityManager.createNativeQuery(
				"INSERT INTO categories (user_id, name, type, is_default) VALUES (?1, ?2, ?3, FALSE)")
				.setParameter(1, userId)
				.setParameter(2, CATEGORY_NAME)
				.setParameter(3, EXPENSE)
				.executeUpdate();
		return ((Number) scalar("SELECT id FROM categories WHERE user_id = ?1 AND name = '" + CATEGORY_NAME + "'",
				userId)).longValue();
	}

	private void insertLimit(UUID userId, long categoryId, int month, int year, String limitAmount) {
		entityManager.createNativeQuery(
				"INSERT INTO budget_limits (user_id, category_id, month, year, limit_amount) "
						+ "VALUES (?1, ?2, ?3, ?4, ?5)")
				.setParameter(1, userId)
				.setParameter(2, categoryId)
				.setParameter(3, month)
				.setParameter(4, year)
				.setParameter(5, new BigDecimal(limitAmount))
				.executeUpdate();
	}

	private void insertTransaction(UUID userId, long categoryId) {
		entityManager.createNativeQuery(
				"INSERT INTO transactions (user_id, category_id, amount, currency, amount_pln, exchange_rate, "
						+ "transaction_date, type) "
						+ "VALUES (?1, ?2, 10.00, ?3, 10.00, 1.0000, CURRENT_DATE, ?4)")
				.setParameter(1, userId)
				.setParameter(2, categoryId)
				.setParameter(3, PLN)
				.setParameter(4, EXPENSE)
				.executeUpdate();
	}

	private Object scalar(String sql, Object parameter) {
		return entityManager.createNativeQuery(sql).setParameter(1, parameter).getSingleResult();
	}

	private long count(String sql, Object parameter) {
		return ((Number) scalar(sql, parameter)).longValue();
	}

}
