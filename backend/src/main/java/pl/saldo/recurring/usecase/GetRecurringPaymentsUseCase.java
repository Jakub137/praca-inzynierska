package pl.saldo.recurring.usecase;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.recurring.api.RecurringPaymentResponse;
import pl.saldo.recurring.infrastructure.RecurringPaymentRepository;

@Service
public class GetRecurringPaymentsUseCase {

	private final RecurringPaymentRepository recurringPaymentRepository;

	public GetRecurringPaymentsUseCase(RecurringPaymentRepository recurringPaymentRepository) {
		this.recurringPaymentRepository = recurringPaymentRepository;
	}

	@Transactional(readOnly = true)
	public List<RecurringPaymentResponse> execute(UUID userId) {
		return recurringPaymentRepository.findAllByUserIdOrderByNextDueDateAscIdAsc(userId).stream()
				.map(RecurringPaymentResponse::fromEntity)
				.toList();
	}

}
