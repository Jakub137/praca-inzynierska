package pl.saldo.transaction.usecase;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.transaction.infrastructure.TransactionRepository;

@Service
public class DeleteTransactionUseCase {

	private final OwnedTransactionFinder transactionFinder;
	private final TransactionRepository transactionRepository;

	public DeleteTransactionUseCase(
			OwnedTransactionFinder transactionFinder,
			TransactionRepository transactionRepository) {
		this.transactionFinder = transactionFinder;
		this.transactionRepository = transactionRepository;
	}

	@Transactional
	public void execute(UUID userId, UUID id) {
		transactionRepository.delete(transactionFinder.find(userId, id));
	}

}
