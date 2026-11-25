package pl.saldo.analytics.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import pl.saldo.analytics.api.CategoryDistributionResponse;
import pl.saldo.analytics.api.CategoryShareResponse;
import pl.saldo.analytics.domain.InvalidAnalyticsQueryException;
import pl.saldo.transaction.infrastructure.CategoryExpenseTotal;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class GetCategoryDistributionUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final String NOVEMBER_NOW = "2026-11-25T10:00:00Z";

	@Mock
	private TransactionRepository transactionRepository;

	@Test
	void shouldReturnTotalAndSharesSortedByAmount() {
		given(transactionRepository.sumAllExpensesByCategory(
				USER_ID, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 7, 1)))
				.willReturn(List.of(
						total(4L, "Transport", "250"),
						total(3L, "Rachunki", "600.00"),
						total(5L, "Zdrowie", "150.00")));

		CategoryDistributionResponse result = useCaseAt(NOVEMBER_NOW)
				.execute(USER_ID, new GetCategoryDistributionQuery("2026-01-01", "2026-06-30"));

		assertThat(result.dateFrom()).isEqualTo(LocalDate.of(2026, 1, 1));
		assertThat(result.dateTo()).isEqualTo(LocalDate.of(2026, 6, 30));
		assertThat(result.totalExpenses()).isEqualTo(new BigDecimal("1000.00"));
		assertThat(result.categories()).containsExactly(
				share(3L, "Rachunki", "600.00", "60.00"),
				share(4L, "Transport", "250.00", "25.00"),
				share(5L, "Zdrowie", "150.00", "15.00"));
	}

	@Test
	void shouldUseWholeWarsawMonthByDefaultAndReturnZeroWithoutExpenses() {
		given(transactionRepository.sumAllExpensesByCategory(
				USER_ID, LocalDate.of(2026, 12, 1), LocalDate.of(2027, 1, 1)))
				.willReturn(List.of());

		// Still November in UTC, already December in Warsaw.
		CategoryDistributionResponse result = useCaseAt("2026-11-30T23:30:00Z")
				.execute(USER_ID, new GetCategoryDistributionQuery(null, null));

		assertThat(result).isEqualTo(new CategoryDistributionResponse(
				LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 31), new BigDecimal("0.00"), List.of()));
	}

	@Test
	void shouldRoundEveryShareOnItsOwnSoSharesMayNotAddUpToHundred() {
		given(transactionRepository.sumAllExpensesByCategory(
				USER_ID, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1)))
				.willReturn(List.of(
						total(1L, "A", "10.00"),
						total(2L, "B", "10.00"),
						total(3L, "C", "10.00")));

		CategoryDistributionResponse result = useCaseAt(NOVEMBER_NOW)
				.execute(USER_ID, new GetCategoryDistributionQuery(null, null));

		assertThat(result.categories())
				.extracting(CategoryShareResponse::percentage)
				.containsExactly(new BigDecimal("33.33"), new BigDecimal("33.33"), new BigDecimal("33.33"));
		assertThat(result.categories().stream()
				.map(CategoryShareResponse::percentage)
				.reduce(BigDecimal.ZERO, BigDecimal::add))
				.isEqualByComparingTo("99.99");
	}

	@Test
	void shouldBreakAmountTiesByNameAndThenById() {
		given(transactionRepository.sumAllExpensesByCategory(
				USER_ID, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1)))
				.willReturn(List.of(
						total(1L, "Zdrowie", "10.00"),
						total(5L, "Auto", "10.00"),
						total(3L, "Auto", "10.00")));

		CategoryDistributionResponse result = useCaseAt(NOVEMBER_NOW)
				.execute(USER_ID, new GetCategoryDistributionQuery(null, null));

		assertThat(result.categories())
				.extracting(CategoryShareResponse::categoryId)
				.containsExactly(3L, 5L, 1L);
	}

	@Test
	void shouldNotQueryRepositoryWhenDatesAreInvalid() {
		assertThatExceptionOfType(InvalidAnalyticsQueryException.class)
				.isThrownBy(() -> useCaseAt(NOVEMBER_NOW)
						.execute(USER_ID, new GetCategoryDistributionQuery("2026-01-01", null)));

		then(transactionRepository).shouldHaveNoInteractions();
	}

	private GetCategoryDistributionUseCase useCaseAt(String instant) {
		return new GetCategoryDistributionUseCase(
				transactionRepository, Clock.fixed(Instant.parse(instant), ZoneOffset.UTC));
	}

	private static CategoryExpenseTotal total(Long categoryId, String categoryName, String amount) {
		return new CategoryExpenseTotal(categoryId, categoryName, new BigDecimal(amount));
	}

	private static CategoryShareResponse share(Long categoryId, String categoryName, String amount, String percentage) {
		return new CategoryShareResponse(
				categoryId, categoryName, new BigDecimal(amount), new BigDecimal(percentage));
	}

}
