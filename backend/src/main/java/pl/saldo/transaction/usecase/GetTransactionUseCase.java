package pl.saldo.transaction.usecase;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.transaction.api.TransactionResponse;

@Service
public class GetTransactionUseCase {

	private final OwnedTransactionFinder transactionFinder;

	public GetTransactionUseCase(OwnedTransactionFinder transactionFinder) {
		this.transactionFinder = transactionFinder;
	}

	@Transactional(readOnly = true)
	public TransactionResponse execute(UUID userId, UUID id) {
		return TransactionResponse.fromEntity(transactionFinder.find(userId, id));
	}

}
