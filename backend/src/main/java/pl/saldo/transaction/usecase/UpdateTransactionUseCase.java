package pl.saldo.transaction.usecase;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.stereotype.Service;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.transaction.api.TransactionResponse;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@Service
public class UpdateTransactionUseCase {

	private final OwnedTransactionFinder transactionFinder;
	private final TransactionCategoryResolver categoryResolver;
	private final PlnConversion plnConversion;
	private final TransactionRepository transactionRepository;

	public UpdateTransactionUseCase(
			OwnedTransactionFinder transactionFinder,
			TransactionCategoryResolver categoryResolver,
			PlnConversion plnConversion,
			TransactionRepository transactionRepository) {
		this.transactionFinder = transactionFinder;
		this.categoryResolver = categoryResolver;
		this.plnConversion = plnConversion;
		this.transactionRepository = transactionRepository;
	}

	// Deliberately not @Transactional (same reason as CreateTransactionUseCase): the rate lookup may block.
	// Order: load the transaction and the category, then the rate if needed, then one save.
	public TransactionResponse execute(UUID userId, UUID id, UpdateTransactionCommand command) {
		TransactionEntity transaction = transactionFinder.find(userId, id);
		CategoryEntity category = categoryResolver.resolve(userId, command.categoryId(), command.type());
		BigDecimal amount = plnConversion.normalizeAmount(command.amount());
		BigDecimal exchangeRate = resolveExchangeRate(transaction, command);
		BigDecimal amountPln = plnConversion.toPln(amount, exchangeRate);
		transaction.update(
				category,
				amount,
				command.currency(),
				amountPln,
				exchangeRate,
				command.date(),
				command.description(),
				command.type());
		transactionRepository.save(transaction);
		// open-in-view is disabled: the copy returned by save (merge) may hold an uninitialised category proxy
		// once the repository transaction has ended, so the response is built from the updated instance.
		return TransactionResponse.fromEntity(transaction);
	}

	// The rate depends only on currency and date, so an edit of anything else keeps the stored rate:
	// the historical value (possibly a fallback one) does not change and NBP is not called.
	private BigDecimal resolveExchangeRate(TransactionEntity transaction, UpdateTransactionCommand command) {
		boolean sameRateKey = command.currency() == transaction.getCurrency()
				&& command.date().equals(transaction.getTransactionDate());
		return sameRateKey ? transaction.getExchangeRate() : plnConversion.fetchRate(command.currency(), command.date());
	}

}
