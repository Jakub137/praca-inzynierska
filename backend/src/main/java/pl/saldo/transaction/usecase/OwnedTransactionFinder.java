package pl.saldo.transaction.usecase;

import java.util.UUID;

import org.springframework.stereotype.Component;

import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@Component
public class OwnedTransactionFinder {

	private final TransactionRepository transactionRepository;

	public OwnedTransactionFinder(TransactionRepository transactionRepository) {
		this.transactionRepository = transactionRepository;
	}

	// Another user's transaction is reported exactly like a missing one (404), never 403.
	public TransactionEntity find(UUID userId, UUID id) {
		return transactionRepository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + id));
	}

}
