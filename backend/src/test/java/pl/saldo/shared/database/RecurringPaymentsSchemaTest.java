package pl.saldo.shared.database;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
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
class RecurringPaymentsSchemaTest {

	private static final String EXPENSE = "EXPENSE";
	private static final String PLN = "PLN";
	private static final String MONTHLY = "MONTHLY";
	private static final String CATEGORY_NAME = "Subskrypcje";
	private static final String PAYMENT_NAME = "Netflix";
	private static final int MAX_NAME_LENGTH = 100;
	private static final String AMOUNT = "43.00";
	private static final LocalDate FUTURE_DATE = LocalDate.of(2030, 6, 1);
	private static final LocalDate PAST_DATE = LocalDate.of(2020, 1, 1);
	private static final long MISSING_CATEGORY_ID = 0L;

	private final EntityManager entityManager;

	@Autowired
	RecurringPaymentsSchemaTest(EntityManager entityManager) {
		this.entityManager = entityManager;
	}

	@Test
	void shouldApplyColumnDefaults() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertPayment(userId, categoryId, PAYMENT_NAME, AMOUNT, PLN, MONTHLY, FUTURE_DATE);

		assertThat(scalar("SELECT created_at IS NOT NULL FROM recurring_payments WHERE user_id = ?1", userId))
				.isEqualTo(true);
	}

	@Test
	void shouldRejectNonPositiveAmount() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);

		assertThatThrownBy(() -> insertPayment(userId, categoryId, PAYMENT_NAME, "0.00", PLN, MONTHLY, FUTURE_DATE))
				.rootCause().hasMessageContaining("chk_recurring_payments_amount_positive");
	}

	@Test
	void shouldRejectUnsupportedCurrency() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);

		assertThatThrownBy(() -> insertPayment(userId, categoryId, PAYMENT_NAME, AMOUNT, "JPY", MONTHLY, FUTURE_DATE))
				.rootCause().hasMessageContaining("chk_recurring_payments_currency");
	}

	@Test
	void shouldRejectUnsupportedFrequency() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);

		assertThatThrownBy(() -> insertPayment(userId, categoryId, PAYMENT_NAME, AMOUNT, PLN, "DAILY", FUTURE_DATE))
				.rootCause().hasMessageContaining("chk_recurring_payments_frequency");
	}

	@Test
	void shouldAcceptEverySupportedFrequency() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		for (String frequency : List.of("WEEKLY", MONTHLY, "YEARLY")) {
			insertPayment(userId, categoryId, PAYMENT_NAME, AMOUNT, PLN, frequency, FUTURE_DATE);
		}

		assertThat(count("SELECT count(*) FROM recurring_payments WHERE user_id = ?1", userId)).isEqualTo(3);
	}

	@Test
	void shouldAllowNextDueDateInThePast() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertPayment(userId, categoryId, PAYMENT_NAME, AMOUNT, PLN, MONTHLY, PAST_DATE);

		assertThat(count("SELECT count(*) FROM recurring_payments WHERE user_id = ?1", userId)).isEqualTo(1);
	}

	@Test
	void shouldRejectMissingNextDueDate() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);

		assertThatThrownBy(() -> entityManager.createNativeQuery(
				"INSERT INTO recurring_payments (user_id, name, amount, currency, frequency, next_due_date, category_id) "
						+ "VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6)")
				.setParameter(1, userId)
				.setParameter(2, PAYMENT_NAME)
				.setParameter(3, new BigDecimal(AMOUNT))
				.setParameter(4, PLN)
				.setParameter(5, MONTHLY)
				.setParameter(6, categoryId)
				.executeUpdate())
				.rootCause().hasMessageContaining("next_due_date");
	}

	@Test
	void shouldRejectNameLongerThanHundredCharacters() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		String tooLongName = "x".repeat(MAX_NAME_LENGTH + 1);

		assertThatThrownBy(() -> insertPayment(userId, categoryId, tooLongName, AMOUNT, PLN, MONTHLY, FUTURE_DATE))
				.rootCause().hasMessageContaining("character varying(100)");
	}

	@Test
	void shouldRejectUnknownCategory() {
		UUID userId = insertUser();

		assertThatThrownBy(() -> insertPayment(
				userId, MISSING_CATEGORY_ID, PAYMENT_NAME, AMOUNT, PLN, MONTHLY, FUTURE_DATE))
				.rootCause().hasMessageContaining("fk_recurring_payments_category");
	}

	@Test
	void shouldDeletePaymentsTogetherWithUser() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertPayment(userId, categoryId, PAYMENT_NAME, AMOUNT, PLN, MONTHLY, FUTURE_DATE);

		int deleted = entityManager.createNativeQuery("DELETE FROM users WHERE id = ?1")
				.setParameter(1, userId)
				.executeUpdate();

		assertThat(deleted).isEqualTo(1);
		assertThat(count("SELECT count(*) FROM recurring_payments WHERE user_id = ?1", userId)).isZero();
	}

	@Test
	void shouldDeletePaymentsTogetherWithCategoryWithoutTransactions() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertPayment(userId, categoryId, PAYMENT_NAME, AMOUNT, PLN, MONTHLY, FUTURE_DATE);

		int deleted = entityManager.createNativeQuery("DELETE FROM categories WHERE id = ?1")
				.setParameter(1, categoryId)
				.executeUpdate();

		assertThat(deleted).isEqualTo(1);
		assertThat(count("SELECT count(*) FROM recurring_payments WHERE user_id = ?1", userId)).isZero();
	}

	@Test
	void shouldRejectDeletingCategoryUsedByTransactionEvenWhenPaymentExists() {
		UUID userId = insertUser();
		long categoryId = insertCategory(userId);
		insertPayment(userId, categoryId, PAYMENT_NAME, AMOUNT, PLN, MONTHLY, FUTURE_DATE);
		insertTransaction(userId, categoryId);

		assertThatThrownBy(() -> entityManager.createNativeQuery("DELETE FROM categories WHERE id = ?1")
				.setParameter(1, categoryId)
				.executeUpdate())
				.rootCause().hasMessageContaining("fk_transactions_category");
	}

	@Test
	void shouldHaveIndexOnUserAndNextDueDate() {
		Object definition = scalar(
				"SELECT indexdef FROM pg_indexes WHERE indexname = ?1", "idx_recurring_payments_user_next_due_date");

		assertThat((String) definition).contains("(user_id, next_due_date)");
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

	private void insertPayment(UUID userId, long categoryId, String name, String amount, String currency,
			String frequency, LocalDate nextDueDate) {
		entityManager.createNativeQuery(
				"INSERT INTO recurring_payments (user_id, name, amount, currency, frequency, next_due_date, category_id) "
						+ "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
				.setParameter(1, userId)
				.setParameter(2, name)
				.setParameter(3, new BigDecimal(amount))
				.setParameter(4, currency)
				.setParameter(5, frequency)
				.setParameter(6, nextDueDate)
				.setParameter(7, categoryId)
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
