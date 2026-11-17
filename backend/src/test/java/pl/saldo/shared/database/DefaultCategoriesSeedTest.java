package pl.saldo.shared.database;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

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
class DefaultCategoriesSeedTest {

	private static final String EXPENSE = "EXPENSE";
	private static final String INCOME = "INCOME";
	private static final String KEBAB_CASE_PATTERN = "^[a-z]+(-[a-z]+)*$";

	private final EntityManager entityManager;

	@Autowired
	DefaultCategoriesSeedTest(EntityManager entityManager) {
		this.entityManager = entityManager;
	}

	@Test
	void shouldSeedExpenseCategories() {
		assertThat(systemCategoryNames(EXPENSE)).containsExactlyInAnyOrder(
				"Artykuły spożywcze", "Rozrywka", "Rachunki", "Transport",
				"Zdrowie", "Restauracje", "Odzież", "Inne wydatki");
	}

	@Test
	void shouldSeedIncomeCategories() {
		assertThat(systemCategoryNames(INCOME)).containsExactlyInAnyOrder(
				"Wynagrodzenie", "Premia", "Inne przychody");
	}

	// Counts only system rows: user categories created by other tests (e.g. T-033) must not break it.
	@Test
	void shouldSeedOnlySystemCategoriesMarkedAsDefault() {
		long systemCategories = count("SELECT count(*) FROM categories WHERE user_id IS NULL");
		long systemDefaults = count("SELECT count(*) FROM categories WHERE user_id IS NULL AND is_default = TRUE");

		assertThat(systemCategories).isEqualTo(11);
		assertThat(systemDefaults).isEqualTo(systemCategories);
	}

	@Test
	void shouldAssignKebabCaseIconToEverySeededCategory() {
		long invalidIcons = count("SELECT count(*) FROM categories "
				+ "WHERE user_id IS NULL AND (icon IS NULL OR icon !~ '" + KEBAB_CASE_PATTERN + "')");

		assertThat(invalidIcons).isZero();
	}

	private List<String> systemCategoryNames(String type) {
		List<?> rows = entityManager.createNativeQuery(
				"SELECT name FROM categories WHERE user_id IS NULL AND type = ?1")
				.setParameter(1, type)
				.getResultList();
		return rows.stream().map(String.class::cast).toList();
	}

	private long count(String sql) {
		return ((Number) entityManager.createNativeQuery(sql).getSingleResult()).longValue();
	}

}
