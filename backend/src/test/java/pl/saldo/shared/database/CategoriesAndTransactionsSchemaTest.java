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
class CategoriesAndTransactionsSchemaTest {

	private static final String EXPENSE = "EXPENSE";
	private static final String PLN = "PLN";
	private static final String CATEGORY_NAME = "Hobby";

	private final EntityManager entityManager;

	@Autowired
	CategoriesAndTransactionsSchemaTest(EntityManager entityManager) {
		this.entityManager = entityManager;
	}

	@Test
	void shouldApplyColumnDefaults() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId, EXPENSE, false);
		insertTransaction(userId, categoryId, EXPENSE, PLN, "10.00");

		assertThat(scalar("SELECT is_default FROM categories WHERE id = ?1", categoryId)).isEqualTo(false);
		assertThat(scalar("SELECT is_recurring FROM transactions WHERE user_id = ?1", userId)).isEqualTo(false);
		assertThat(scalar("SELECT created_at IS NOT NULL FROM transactions WHERE user_id = ?1", userId))
				.isEqualTo(true);
	}

	@Test
	void shouldRejectCategoryWithUnknownType() {
		UUID userId = insertUser();

		assertThatThrownBy(() -> insertCategory(userId, "TRANSFER", false))
				.rootCause().hasMessageContaining("chk_categories_type");
	}

	@Test
	void shouldAcceptSystemCategoryWithoutOwner() {
		int inserted = entityManager.createNativeQuery(
				"INSERT INTO categories (user_id, name, type, is_default) VALUES (NULL, 'System', 'EXPENSE', TRUE)")
				.executeUpdate();

		assertThat(inserted).isEqualTo(1);
	}

	@Test
	void shouldRejectSystemCategoryNotMarkedAsDefault() {
		assertThatThrownBy(() -> entityManager.createNativeQuery(
				"INSERT INTO categories (user_id, name, type, is_default) VALUES (NULL, 'System', 'EXPENSE', FALSE)")
				.executeUpdate())
				.rootCause().hasMessageContaining("chk_categories_default_owner");
	}

	@Test
	void shouldRejectDefaultCategoryOwnedByUser() {
		UUID userId = insertUser();

		assertThatThrownBy(() -> insertCategory(userId, EXPENSE, true))
				.rootCause().hasMessageContaining("chk_categories_default_owner");
	}

	@Test
	void shouldRejectTransactionWithUnknownType() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId, EXPENSE, false);

		assertThatThrownBy(() -> insertTransaction(userId, categoryId, "TRANSFER", PLN, "10.00"))
				.rootCause().hasMessageContaining("chk_transactions_type");
	}

	@Test
	void shouldRejectTransactionWithUnsupportedCurrency() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId, EXPENSE, false);

		assertThatThrownBy(() -> insertTransaction(userId, categoryId, EXPENSE, "JPY", "10.00"))
				.rootCause().hasMessageContaining("chk_transactions_currency");
	}

	@Test
	void shouldRejectTransactionWithNonPositiveAmount() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId, EXPENSE, false);

		assertThatThrownBy(() -> insertTransaction(userId, categoryId, EXPENSE, PLN, "0.00"))
				.rootCause().hasMessageContaining("chk_transactions_amounts_positive");
	}

	@Test
	void shouldDeleteUserTogetherWithCategoriesAndTransactions() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId, EXPENSE, false);
		insertTransaction(userId, categoryId, EXPENSE, PLN, "10.00");

		int deleted = entityManager.createNativeQuery("DELETE FROM users WHERE id = ?1")
				.setParameter(1, userId)
				.executeUpdate();

		assertThat(deleted).isEqualTo(1);
		assertThat(count("SELECT count(*) FROM transactions WHERE user_id = ?1", userId)).isZero();
		assertThat(count("SELECT count(*) FROM categories WHERE user_id = ?1", userId)).isZero();
	}

	@Test
	void shouldRejectDeletingCategoryUsedByTransaction() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId, EXPENSE, false);
		insertTransaction(userId, categoryId, EXPENSE, PLN, "10.00");

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

	private long insertCategory(UUID userId, String type, boolean isDefault) {
		entityManager.createNativeQuery(
				"INSERT INTO categories (user_id, name, type, is_default) VALUES (?1, ?2, ?3, ?4)")
				.setParameter(1, userId)
				.setParameter(2, CATEGORY_NAME)
				.setParameter(3, type)
				.setParameter(4, isDefault)
				.executeUpdate();
		return ((Number) scalar("SELECT id FROM categories WHERE user_id = ?1 AND name = '" + CATEGORY_NAME + "'",
				userId)).longValue();
	}

	private void insertTransaction(UUID userId, long categoryId, String type, String currency, String amount) {
		entityManager.createNativeQuery(
				"INSERT INTO transactions (user_id, category_id, amount, currency, amount_pln, exchange_rate, "
						+ "transaction_date, type) "
						+ "VALUES (?1, ?2, ?3, ?4, ?6, 1.0000, CURRENT_DATE, ?5)")
				.setParameter(1, userId)
				.setParameter(2, categoryId)
				.setParameter(3, new BigDecimal(amount))
				.setParameter(4, currency)
				.setParameter(5, type)
				.setParameter(6, new BigDecimal(amount))
				.executeUpdate();
	}

	private Object scalar(String sql, Object parameter) {
		return entityManager.createNativeQuery(sql).setParameter(1, parameter).getSingleResult();
	}

	private long count(String sql, Object parameter) {
		return ((Number) scalar(sql, parameter)).longValue();
	}

}
