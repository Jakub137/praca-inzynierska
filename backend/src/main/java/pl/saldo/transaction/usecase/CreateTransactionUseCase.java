package pl.saldo.transaction.usecase;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.ExchangeRateProvider;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.api.TransactionResponse;
import pl.saldo.transaction.domain.AmountPlnLimitExceededException;
import pl.saldo.transaction.domain.CategoryTypeMismatchException;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@Service
public class CreateTransactionUseCase {

	private static final int RATE_SCALE = 4;
	private static final int MONEY_SCALE = 2;
	// Largest value of amount_pln DECIMAL(12,2).
	private static final BigDecimal MAX_AMOUNT_PLN = new BigDecimal("9999999999.99");

	private final CategoryRepository categoryRepository;
	private final TransactionRepository transactionRepository;
	private final ExchangeRateProvider exchangeRateProvider;
	private final Clock clock;

	public CreateTransactionUseCase(
			CategoryRepository categoryRepository,
			TransactionRepository transactionRepository,
			ExchangeRateProvider exchangeRateProvider,
			Clock clock) {
		this.categoryRepository = categoryRepository;
		this.transactionRepository = transactionRepository;
		this.exchangeRateProvider = exchangeRateProvider;
		this.clock = clock;
	}

	// Deliberately not @Transactional: the rate lookup may block for seconds (NBP timeout) and must not
	// hold a database connection. Order matters: cheap category checks first, then the rate, then one save.
	public TransactionResponse execute(UUID userId, CreateTransactionCommand command) {
		CategoryEntity category = findCategory(userId, command);
		BigDecimal amount = command.amount().setScale(MONEY_SCALE);
		BigDecimal exchangeRate = fetchExchangeRate(command);
		BigDecimal amountPln = convertToPln(amount, exchangeRate);
		TransactionEntity transaction = new TransactionEntity(
				userId,
				category,
				amount,
				command.currency(),
				amountPln,
				exchangeRate,
				command.date(),
				command.description(),
				command.type(),
				Instant.now(clock));
		return TransactionResponse.fromEntity(transactionRepository.save(transaction));
	}

	private CategoryEntity findCategory(UUID userId, CreateTransactionCommand command) {
		CategoryEntity category = categoryRepository.findAccessibleById(command.categoryId(), userId)
				.orElseThrow(() -> new ResourceNotFoundException("Category not found: " + command.categoryId()));
		if (category.getType() != command.type()) {
			throw new CategoryTypeMismatchException();
		}
		return category;
	}

	// The column holds 4 decimals, so the rate is rounded before the multiplication: the stored rate
	// is then exactly the one used to compute amount_pln. For PLN the provider returns 1 -> 1.0000.
	private BigDecimal fetchExchangeRate(CreateTransactionCommand command) {
		return exchangeRateProvider.getRate(command.currency(), command.date())
				.setScale(RATE_SCALE, RoundingMode.HALF_UP);
	}

	private BigDecimal convertToPln(BigDecimal amount, BigDecimal exchangeRate) {
		BigDecimal amountPln = amount.multiply(exchangeRate).setScale(MONEY_SCALE, RoundingMode.HALF_UP);
		if (amountPln.compareTo(MAX_AMOUNT_PLN) > 0) {
			throw new AmountPlnLimitExceededException();
		}
		return amountPln;
	}

}
