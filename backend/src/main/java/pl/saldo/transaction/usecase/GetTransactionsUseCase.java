package pl.saldo.transaction.usecase;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.shared.api.PageResponse;
import pl.saldo.transaction.api.TransactionResponse;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.infrastructure.TransactionRepository;
import pl.saldo.transaction.infrastructure.TransactionSpecifications;

@Service
public class GetTransactionsUseCase {

	private final TransactionRepository transactionRepository;

	public GetTransactionsUseCase(TransactionRepository transactionRepository) {
		this.transactionRepository = transactionRepository;
	}

	@Transactional(readOnly = true)
	public PageResponse<TransactionResponse> execute(UUID userId, GetTransactionsQuery query) {
		Page<TransactionEntity> page = transactionRepository.findAll(
				TransactionSpecifications.matching(
						userId, query.categoryId(), query.type(), query.dateFrom(), query.dateTo()),
				query.toPageable());
		return PageResponse.fromPage(page, TransactionResponse::fromEntity);
	}

}
