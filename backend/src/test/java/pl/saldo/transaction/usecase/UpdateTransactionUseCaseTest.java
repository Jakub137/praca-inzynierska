package pl.saldo.transaction.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.currency.domain.ExchangeRateQuote;
import pl.saldo.currency.domain.ExchangeRateUnavailableException;
import pl.saldo.currency.domain.RateSource;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.api.TransactionResponse;
import pl.saldo.transaction.domain.AmountPlnLimitExceededException;
import pl.saldo.transaction.domain.CategoryTypeMismatchException;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class UpdateTransactionUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final UUID TRANSACTION_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
	private static final long CATEGORY_ID = 5L;
	private static final LocalDate DATE = LocalDate.of(2026, 11, 14);
	private static final LocalDate NEW_DATE = LocalDate.of(2026, 11, 15);
	private static final Instant CREATED_AT = Instant.parse("2026-11-17T10:00:00Z");

	@Mock
	private CategoryRepository categoryRepository;

	@Mock
	private TransactionRepository transactionRepository;

	private FakeRateProvider rateProvider;
	private TransactionEntity transaction;
	private UpdateTransactionUseCase useCase;

	// The stored transaction is 10.00 EUR at 4.3000 on DATE (43.00 PLN).
	@BeforeEach
	void setUp() {
		rateProvider = new FakeRateProvider();
		CategoryEntity category = new CategoryEntity(USER_ID, "Bilety", "ticket", TransactionType.EXPENSE);
		ReflectionTestUtils.setField(category, "id", CATEGORY_ID);
		transaction = new TransactionEntity(
				USER_ID, category, new BigDecimal("10.00"), SupportedCurrency.EUR, new BigDecimal("43.00"),
				new BigDecimal("4.3000"), DATE, "Stary opis", TransactionType.EXPENSE, CREATED_AT);
		ReflectionTestUtils.setField(transaction, "id", TRANSACTION_ID);
		useCase = new UpdateTransactionUseCase(
				new OwnedTransactionFinder(transactionRepository),
				new TransactionCategoryResolver(categoryRepository),
				new PlnConversion(rateProvider),
				transactionRepository);
	}

	@Test
	void shouldKeepStoredRateAndSkipRateSourceWhenOnlyAmountAndDescriptionChange() {
		givenTransaction();
		givenCategory();
		givenSave();

		TransactionResponse result = useCase.execute(USER_ID, TRANSACTION_ID, command("20.00", SupportedCurrency.EUR, DATE));

		assertThat(result.amount()).isEqualTo(new BigDecimal("20.00"));
		assertThat(result.exchangeRate()).isEqualTo(new BigDecimal("4.3000"));
		assertThat(result.amountPln()).isEqualTo(new BigDecimal("86.00"));
		assertThat(result.description()).isEqualTo("Nowy opis");
		assertThat(rateProvider.fetchCalls).isZero();
	}

	// 0.01 * 4.5000 = 0.045 is an exact tie: HALF_UP gives 0.05, same as on create.
	@Test
	void shouldRoundAmountPlnHalfUpFromStoredRate() {
		ReflectionTestUtils.setField(transaction, "exchangeRate", new BigDecimal("4.5000"));
		givenTransaction();
		givenCategory();
		givenSave();

		TransactionResponse result = useCase.execute(USER_ID, TRANSACTION_ID, command("0.01", SupportedCurrency.EUR, DATE));

		assertThat(result.amountPln()).isEqualTo(new BigDecimal("0.05"));
	}

	@Test
	void shouldFetchRateWhenCurrencyChanges() {
		givenTransaction();
		givenCategory();
		givenSave();
		rateProvider.rate = new BigDecimal("3.9000");

		TransactionResponse result = useCase.execute(USER_ID, TRANSACTION_ID, command("10.00", SupportedCurrency.USD, DATE));

		assertThat(rateProvider.fetchCalls).isEqualTo(1);
		assertThat(rateProvider.requestedCurrency).isEqualTo(SupportedCurrency.USD);
		assertThat(rateProvider.requestedDate).isEqualTo(DATE);
		assertThat(result.currency()).isEqualTo(SupportedCurrency.USD);
		assertThat(result.exchangeRate()).isEqualTo(new BigDecimal("3.9000"));
		assertThat(result.amountPln()).isEqualTo(new BigDecimal("39.00"));
	}

	@Test
	void shouldFetchRateForNewDateWhenDateChanges() {
		givenTransaction();
		givenCategory();
		givenSave();
		rateProvider.rate = new BigDecimal("4.4000");

		TransactionResponse result = useCase.execute(USER_ID, TRANSACTION_ID, command("10.00", SupportedCurrency.EUR, NEW_DATE));

		assertThat(rateProvider.fetchCalls).isEqualTo(1);
		assertThat(rateProvider.requestedDate).isEqualTo(NEW_DATE);
		assertThat(result.date()).isEqualTo(NEW_DATE);
		assertThat(result.exchangeRate()).isEqualTo(new BigDecimal("4.4000"));
		assertThat(result.amountPln()).isEqualTo(new BigDecimal("44.00"));
	}

	@Test
	void shouldStoreRateOneWithoutRateSourceWhenCurrencyChangesToPln() {
		givenTransaction();
		givenCategory();
		givenSave();

		TransactionResponse result = useCase.execute(USER_ID, TRANSACTION_ID, command("10.00", SupportedCurrency.PLN, DATE));

		assertThat(result.currency()).isEqualTo(SupportedCurrency.PLN);
		assertThat(result.exchangeRate()).isEqualTo(new BigDecimal("1.0000"));
		assertThat(result.amountPln()).isEqualTo(new BigDecimal("10.00"));
		assertThat(rateProvider.fetchCalls).isZero();
	}

	@Test
	void shouldUpdateFieldsAndKeepOwnerCreationTimeAndRecurringFlag() {
		givenTransaction();
		givenCategory();
		givenSave();

		useCase.execute(USER_ID, TRANSACTION_ID, command("20.00", SupportedCurrency.EUR, DATE));

		then(transactionRepository).should().save(transaction);
		assertThat(transaction.getUserId()).isEqualTo(USER_ID);
		assertThat(transaction.getCreatedAt()).isEqualTo(CREATED_AT);
		assertThat(transaction.isRecurring()).isFalse();
		assertThat(transaction.getDescription()).isEqualTo("Nowy opis");
		assertThat(transaction.getType()).isEqualTo(TransactionType.EXPENSE);
	}

	@Test
	void shouldBuildResponseFromUpdatedTransactionInsteadOfSaveResult() {
		givenTransaction();
		givenCategory();
		given(transactionRepository.save(any(TransactionEntity.class))).willReturn(null);

		TransactionResponse result = useCase.execute(USER_ID, TRANSACTION_ID, command("20.00", SupportedCurrency.EUR, DATE));

		assertThat(result.id()).isEqualTo(TRANSACTION_ID);
		assertThat(result.amount()).isEqualTo(new BigDecimal("20.00"));
		assertThat(result.categoryName()).isEqualTo("Bilety");
	}

	@Test
	void shouldRejectAmountPlnOverColumnLimitAndLeaveTransactionUnchanged() {
		ReflectionTestUtils.setField(transaction, "exchangeRate", new BigDecimal("2.0000"));
		givenTransaction();
		givenCategory();

		assertThatThrownBy(() -> useCase.execute(
				USER_ID, TRANSACTION_ID, command("5000000000.00", SupportedCurrency.EUR, DATE)))
				.isInstanceOf(AmountPlnLimitExceededException.class);

		assertThat(transaction.getAmount()).isEqualTo(new BigDecimal("10.00"));
		then(transactionRepository).should(never()).save(any(TransactionEntity.class));
	}

	@Test
	void shouldThrowNotFoundWhenTransactionIsMissingOrNotOwned() {
		given(transactionRepository.findByIdAndUserId(TRANSACTION_ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> useCase.execute(
				USER_ID, TRANSACTION_ID, command("20.00", SupportedCurrency.EUR, DATE)))
				.isInstanceOf(ResourceNotFoundException.class);

		then(categoryRepository).shouldHaveNoInteractions();
		assertThat(rateProvider.fetchCalls).isZero();
		then(transactionRepository).should(never()).save(any(TransactionEntity.class));
	}

	@Test
	void shouldThrowNotFoundWhenCategoryIsMissingOrNotAccessible() {
		givenTransaction();
		given(categoryRepository.findAccessibleById(CATEGORY_ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> useCase.execute(
				USER_ID, TRANSACTION_ID, command("20.00", SupportedCurrency.USD, DATE)))
				.isInstanceOf(ResourceNotFoundException.class);

		assertThat(rateProvider.fetchCalls).isZero();
		then(transactionRepository).should(never()).save(any(TransactionEntity.class));
	}

	@Test
	void shouldThrowAndSkipRateWhenCategoryTypeDiffersFromTransactionType() {
		givenTransaction();
		givenCategory();
		UpdateTransactionCommand command = new UpdateTransactionCommand(
				new BigDecimal("10.00"), SupportedCurrency.USD, CATEGORY_ID, DATE, null, TransactionType.INCOME);

		assertThatThrownBy(() -> useCase.execute(USER_ID, TRANSACTION_ID, command))
				.isInstanceOf(CategoryTypeMismatchException.class);

		assertThat(rateProvider.fetchCalls).isZero();
		then(transactionRepository).should(never()).save(any(TransactionEntity.class));
	}

	@Test
	void shouldPropagateRateUnavailableAndLeaveTransactionUnchanged() {
		givenTransaction();
		givenCategory();
		rateProvider.failure = new ExchangeRateUnavailableException("NBP down");

		assertThatThrownBy(() -> useCase.execute(
				USER_ID, TRANSACTION_ID, command("10.00", SupportedCurrency.USD, DATE)))
				.isSameAs(rateProvider.failure);

		assertThat(transaction.getCurrency()).isEqualTo(SupportedCurrency.EUR);
		then(transactionRepository).should(never()).save(any(TransactionEntity.class));
	}

	private void givenTransaction() {
		given(transactionRepository.findByIdAndUserId(TRANSACTION_ID, USER_ID)).willReturn(Optional.of(transaction));
	}

	private void givenCategory() {
		given(categoryRepository.findAccessibleById(CATEGORY_ID, USER_ID)).willReturn(Optional.of(transaction.getCategory()));
	}

	private void givenSave() {
		given(transactionRepository.save(any(TransactionEntity.class))).willAnswer(invocation -> invocation.getArgument(0));
	}

	private static UpdateTransactionCommand command(String amount, SupportedCurrency currency, LocalDate date) {
		return new UpdateTransactionCommand(
				new BigDecimal(amount), currency, CATEGORY_ID, date, "Nowy opis", TransactionType.EXPENSE);
	}

	// Implements only fetchQuote, so the real default getRate (PLN shortcut) is exercised.
	private static final class FakeRateProvider implements ExchangeRateProvider {

		private BigDecimal rate = new BigDecimal("4.3000");
		private RuntimeException failure;
		private int fetchCalls;
		private SupportedCurrency requestedCurrency;
		private LocalDate requestedDate;

		@Override
		public ExchangeRateQuote fetchQuote(SupportedCurrency currency, LocalDate date) {
			fetchCalls++;
			requestedCurrency = currency;
			requestedDate = date;
			if (failure != null) {
				throw failure;
			}
			return new ExchangeRateQuote(rate, date, RateSource.NBP);
		}

	}

}
