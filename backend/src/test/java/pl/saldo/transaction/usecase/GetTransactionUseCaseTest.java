package pl.saldo.transaction.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

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
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.api.TransactionResponse;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class GetTransactionUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final UUID TRANSACTION_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");

	@Mock
	private TransactionRepository transactionRepository;

	private GetTransactionUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new GetTransactionUseCase(new OwnedTransactionFinder(transactionRepository));
	}

	@Test
	void shouldReturnOwnedTransaction() {
		CategoryEntity category = new CategoryEntity(USER_ID, "Bilety", "ticket", TransactionType.EXPENSE);
		ReflectionTestUtils.setField(category, "id", 5L);
		TransactionEntity transaction = new TransactionEntity(
				USER_ID, category, new BigDecimal("10.00"), SupportedCurrency.EUR, new BigDecimal("43.00"),
				new BigDecimal("4.3000"), LocalDate.of(2026, 11, 14), "Bilet", TransactionType.EXPENSE, NOW);
		ReflectionTestUtils.setField(transaction, "id", TRANSACTION_ID);
		given(transactionRepository.findByIdAndUserId(TRANSACTION_ID, USER_ID)).willReturn(Optional.of(transaction));

		TransactionResponse result = useCase.execute(USER_ID, TRANSACTION_ID);

		assertThat(result.id()).isEqualTo(TRANSACTION_ID);
		assertThat(result.amount()).isEqualTo(new BigDecimal("10.00"));
		assertThat(result.amountPln()).isEqualTo(new BigDecimal("43.00"));
		assertThat(result.categoryId()).isEqualTo(5L);
		assertThat(result.categoryName()).isEqualTo("Bilety");
	}

	@Test
	void shouldThrowNotFoundWhenTransactionIsMissingOrNotOwned() {
		given(transactionRepository.findByIdAndUserId(TRANSACTION_ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> useCase.execute(USER_ID, TRANSACTION_ID))
				.isInstanceOf(ResourceNotFoundException.class);
	}

}
