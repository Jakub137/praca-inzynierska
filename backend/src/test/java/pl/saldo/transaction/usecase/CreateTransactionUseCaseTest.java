package pl.saldo.transaction.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.api.TransactionResponse;
import pl.saldo.transaction.domain.AmountPlnLimitExceededException;
import pl.saldo.transaction.domain.CategoryTypeMismatchException;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class CreateTransactionUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final UUID TRANSACTION_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
	private static final long CATEGORY_ID = 5L;
	private static final LocalDate DATE = LocalDate.of(2026, 11, 14);
	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");

	@Mock
	private CategoryRepository categoryRepository;

	@Mock
	private TransactionRepository transactionRepository;

	private FakeRateProvider rateProvider;
	private CategoryEntity category;
	private CreateTransactionUseCase useCase;

	@BeforeEach
	void setUp() {
		rateProvider = new FakeRateProvider();
		category = new CategoryEntity(USER_ID, "Bilety", "ticket", TransactionType.EXPENSE);
		ReflectionTestUtils.setField(category, "id", CATEGORY_ID);
		useCase = new CreateTransactionUseCase(
				categoryRepository, transactionRepository, rateProvider, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	// 0.01 * 4.5000 = 0.045 is an exact tie: HALF_UP gives 0.05 (HALF_EVEN would give 0.04).
	@ParameterizedTest
	@CsvSource({
			"0.01,   4.5000, 0.05",
			"0.01,   4.4999, 0.04",
			"123.45, 4.2371, 523.07",
			"10.05,  4.3125, 43.34"
	})
	void shouldRoundAmountPlnHalfUpToTwoDecimals(String amount, String rate, String expectedPln) {
		givenCategoryAndSave();
		rateProvider.rate = new BigDecimal(rate);

		TransactionResponse result = useCase.execute(USER_ID, command(amount, SupportedCurrency.EUR));

		assertThat(result.amountPln()).isEqualTo(new BigDecimal(expectedPln));
		assertThat(result.exchangeRate()).isEqualTo(new BigDecimal(rate));
	}

	// 1000.00 * 4.3001 = 4300.10, but with the unrounded rate 4.30005 it would be 4300.05.
	@Test
	void shouldRoundRateToFourDecimalsBeforeMultiplying() {
		givenCategoryAndSave();
		rateProvider.rate = new BigDecimal("4.30005");

		TransactionResponse result = useCase.execute(USER_ID, command("1000.00", SupportedCurrency.EUR));

		assertThat(result.exchangeRate()).isEqualTo(new BigDecimal("4.3001"));
		assertThat(result.amountPln()).isEqualTo(new BigDecimal("4300.10"));
	}

	@Test
	void shouldStoreRateOneAndSameAmountForPlnWithoutCallingRateSource() {
		givenCategoryAndSave();

		TransactionResponse result = useCase.execute(USER_ID, command("100", SupportedCurrency.PLN));

		assertThat(result.amount()).isEqualTo(new BigDecimal("100.00"));
		assertThat(result.amountPln()).isEqualTo(new BigDecimal("100.00"));
		assertThat(result.exchangeRate()).isEqualTo(new BigDecimal("1.0000"));
		assertThat(rateProvider.fetchCalls).isZero();
	}

	@Test
	void shouldRequestRateForTransactionDate() {
		givenCategoryAndSave();

		useCase.execute(USER_ID, command("10.00", SupportedCurrency.USD));

		assertThat(rateProvider.fetchCalls).isEqualTo(1);
		assertThat(rateProvider.requestedCurrency).isEqualTo(SupportedCurrency.USD);
		assertThat(rateProvider.requestedDate).isEqualTo(DATE);
	}

	@Test
	void shouldSaveEntityOwnedByUserWithCategoryAndClockTimestamp() {
		givenCategoryAndSave();
		CreateTransactionCommand command = new CreateTransactionCommand(
				new BigDecimal("10.50"), SupportedCurrency.EUR, CATEGORY_ID, DATE, "Bilety", TransactionType.EXPENSE);

		TransactionResponse result = useCase.execute(USER_ID, command);

		ArgumentCaptor<TransactionEntity> captor = ArgumentCaptor.forClass(TransactionEntity.class);
		then(transactionRepository).should().save(captor.capture());
		TransactionEntity saved = captor.getValue();
		assertThat(saved.getUserId()).isEqualTo(USER_ID);
		assertThat(saved.getCategory()).isSameAs(category);
		assertThat(saved.getAmount()).isEqualTo(new BigDecimal("10.50"));
		assertThat(saved.getCurrency()).isEqualTo(SupportedCurrency.EUR);
		assertThat(saved.getTransactionDate()).isEqualTo(DATE);
		assertThat(saved.getDescription()).isEqualTo("Bilety");
		assertThat(saved.getType()).isEqualTo(TransactionType.EXPENSE);
		assertThat(saved.isRecurring()).isFalse();
		assertThat(saved.getCreatedAt()).isEqualTo(NOW);
		assertThat(result).isEqualTo(new TransactionResponse(
				TRANSACTION_ID, new BigDecimal("10.50"), SupportedCurrency.EUR, new BigDecimal("4.3000"),
				new BigDecimal("45.15"), DATE, "Bilety", TransactionType.EXPENSE, CATEGORY_ID, "Bilety", "ticket",
				false, NOW));
	}

	@Test
	void shouldAcceptAmountPlnEqualToColumnLimit() {
		givenCategoryAndSave();
		rateProvider.rate = new BigDecimal("3.0000");

		TransactionResponse result = useCase.execute(USER_ID, command("3333333333.33", SupportedCurrency.EUR));

		assertThat(result.amountPln()).isEqualTo(new BigDecimal("9999999999.99"));
	}

	@Test
	void shouldRejectAmountPlnOneGroszOverColumnLimit() {
		givenCategory();
		rateProvider.rate = new BigDecimal("2.0000");

		assertThatThrownBy(() -> useCase.execute(USER_ID, command("5000000000.00", SupportedCurrency.EUR)))
				.isInstanceOf(AmountPlnLimitExceededException.class);

		then(transactionRepository).should(never()).save(any(TransactionEntity.class));
	}

	@Test
	void shouldThrowNotFoundAndSkipRateWhenCategoryIsMissingOrNotAccessible() {
		given(categoryRepository.findAccessibleById(CATEGORY_ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> useCase.execute(USER_ID, command("10.00", SupportedCurrency.EUR)))
				.isInstanceOf(ResourceNotFoundException.class);

		assertThat(rateProvider.fetchCalls).isZero();
		then(transactionRepository).should(never()).save(any(TransactionEntity.class));
	}

	@Test
	void shouldThrowAndSkipRateWhenCategoryTypeDiffersFromTransactionType() {
		givenCategory();
		CreateTransactionCommand command = new CreateTransactionCommand(
				new BigDecimal("10.00"), SupportedCurrency.EUR, CATEGORY_ID, DATE, null, TransactionType.INCOME);

		assertThatThrownBy(() -> useCase.execute(USER_ID, command))
				.isInstanceOf(CategoryTypeMismatchException.class);

		assertThat(rateProvider.fetchCalls).isZero();
		then(transactionRepository).should(never()).save(any(TransactionEntity.class));
	}

	@Test
	void shouldPropagateRateUnavailableAndNotSave() {
		givenCategory();
		rateProvider.failure = new ExchangeRateUnavailableException("NBP down");

		assertThatThrownBy(() -> useCase.execute(USER_ID, command("10.00", SupportedCurrency.EUR)))
				.isSameAs(rateProvider.failure);

		then(transactionRepository).should(never()).save(any(TransactionEntity.class));
	}

	private void givenCategory() {
		given(categoryRepository.findAccessibleById(CATEGORY_ID, USER_ID)).willReturn(Optional.of(category));
	}

	private void givenCategoryAndSave() {
		givenCategory();
		given(transactionRepository.save(any(TransactionEntity.class))).willAnswer(invocation -> {
			TransactionEntity saved = invocation.getArgument(0);
			ReflectionTestUtils.setField(saved, "id", TRANSACTION_ID);
			return saved;
		});
	}

	private static CreateTransactionCommand command(String amount, SupportedCurrency currency) {
		return new CreateTransactionCommand(
				new BigDecimal(amount), currency, CATEGORY_ID, DATE, null, TransactionType.EXPENSE);
	}

	// Implements only fetchRate, so the real default getRate (PLN shortcut) is exercised.
	private static final class FakeRateProvider implements ExchangeRateProvider {

		private BigDecimal rate = new BigDecimal("4.3000");
		private RuntimeException failure;
		private int fetchCalls;
		private SupportedCurrency requestedCurrency;
		private LocalDate requestedDate;

		@Override
		public BigDecimal fetchRate(SupportedCurrency currency, LocalDate date) {
			fetchCalls++;
			requestedCurrency = currency;
			requestedDate = date;
			if (failure != null) {
				throw failure;
			}
			return rate;
		}

	}

}
