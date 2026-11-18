package pl.saldo.transaction.usecase;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.transaction.api.TransactionResponse;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@Service
public class CreateTransactionUseCase {

	private final TransactionCategoryResolver categoryResolver;
	private final PlnConversion plnConversion;
	private final TransactionRepository transactionRepository;
	private final Clock clock;

	public CreateTransactionUseCase(
			TransactionCategoryResolver categoryResolver,
			PlnConversion plnConversion,
			TransactionRepository transactionRepository,
			Clock clock) {
		this.categoryResolver = categoryResolver;
		this.plnConversion = plnConversion;
		this.transactionRepository = transactionRepository;
		this.clock = clock;
	}

	// Deliberately not @Transactional: the rate lookup may block for seconds (NBP timeout) and must not
	// hold a database connection. Order matters: cheap category checks first, then the rate, then one save.
	public TransactionResponse execute(UUID userId, CreateTransactionCommand command) {
		CategoryEntity category = categoryResolver.resolve(userId, command.categoryId(), command.type());
		BigDecimal amount = plnConversion.normalizeAmount(command.amount());
		BigDecimal exchangeRate = plnConversion.fetchRate(command.currency(), command.date());
		BigDecimal amountPln = plnConversion.toPln(amount, exchangeRate);
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

}
