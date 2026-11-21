package pl.saldo.recurring.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.recurring.api.RecurringPaymentResponse;
import pl.saldo.recurring.domain.PaymentFrequency;
import pl.saldo.recurring.domain.RecurringPaymentEntity;
import pl.saldo.recurring.infrastructure.RecurringPaymentRepository;
import pl.saldo.transaction.domain.TransactionType;

@ExtendWith(MockitoExtension.class)
class GetRecurringPaymentsUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");

	@Mock
	private RecurringPaymentRepository recurringPaymentRepository;

	private GetRecurringPaymentsUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new GetRecurringPaymentsUseCase(recurringPaymentRepository);
	}

	@Test
	void shouldReturnPaymentsInRepositoryOrderAsResponses() {
		CategoryEntity entertainment = category(5L, "Rozrywka");
		CategoryEntity bills = category(6L, "Rachunki");
		given(recurringPaymentRepository.findAllByUserIdOrderByNextDueDateAscIdAsc(USER_ID)).willReturn(List.of(
				payment(1L, "Netflix", "43.00", PaymentFrequency.MONTHLY, LocalDate.of(2026, 12, 1), entertainment),
				payment(2L, "Czynsz", "850.00", PaymentFrequency.MONTHLY, LocalDate.of(2026, 12, 8), bills)));

		List<RecurringPaymentResponse> responses = useCase.execute(USER_ID);

		assertThat(responses).containsExactly(
				new RecurringPaymentResponse(1L, "Netflix", new BigDecimal("43.00"), SupportedCurrency.PLN,
						PaymentFrequency.MONTHLY, LocalDate.of(2026, 12, 1), 5L, "Rozrywka"),
				new RecurringPaymentResponse(2L, "Czynsz", new BigDecimal("850.00"), SupportedCurrency.PLN,
						PaymentFrequency.MONTHLY, LocalDate.of(2026, 12, 8), 6L, "Rachunki"));
	}

	@Test
	void shouldReturnEmptyListWhenUserHasNoPayments() {
		given(recurringPaymentRepository.findAllByUserIdOrderByNextDueDateAscIdAsc(USER_ID)).willReturn(List.of());

		assertThat(useCase.execute(USER_ID)).isEmpty();
	}

	private static CategoryEntity category(Long id, String name) {
		CategoryEntity category = new CategoryEntity(USER_ID, name, null, TransactionType.EXPENSE);
		ReflectionTestUtils.setField(category, "id", id);
		return category;
	}

	private static RecurringPaymentEntity payment(Long id, String name, String amount, PaymentFrequency frequency,
			LocalDate nextDueDate, CategoryEntity category) {
		RecurringPaymentEntity payment = new RecurringPaymentEntity(
				USER_ID, name, new BigDecimal(amount), SupportedCurrency.PLN, frequency, nextDueDate, category, NOW);
		ReflectionTestUtils.setField(payment, "id", id);
		return payment;
	}

}
