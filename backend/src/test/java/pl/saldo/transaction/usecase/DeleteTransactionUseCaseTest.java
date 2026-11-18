package pl.saldo.transaction.usecase;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

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

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class DeleteTransactionUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final UUID TRANSACTION_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");

	@Mock
	private TransactionRepository transactionRepository;

	private DeleteTransactionUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new DeleteTransactionUseCase(new OwnedTransactionFinder(transactionRepository), transactionRepository);
	}

	@Test
	void shouldDeleteOwnedTransaction() {
		CategoryEntity category = new CategoryEntity(USER_ID, "Bilety", "ticket", TransactionType.EXPENSE);
		TransactionEntity transaction = new TransactionEntity(
				USER_ID, category, new BigDecimal("10.00"), SupportedCurrency.PLN, new BigDecimal("10.00"),
				new BigDecimal("1.0000"), LocalDate.of(2026, 11, 14), null, TransactionType.EXPENSE, NOW);
		given(transactionRepository.findByIdAndUserId(TRANSACTION_ID, USER_ID)).willReturn(Optional.of(transaction));

		useCase.execute(USER_ID, TRANSACTION_ID);

		then(transactionRepository).should().delete(transaction);
	}

	@Test
	void shouldThrowNotFoundAndNotDeleteWhenTransactionIsMissingOrNotOwned() {
		given(transactionRepository.findByIdAndUserId(TRANSACTION_ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> useCase.execute(USER_ID, TRANSACTION_ID))
				.isInstanceOf(ResourceNotFoundException.class);

		then(transactionRepository).should(never()).delete(any(TransactionEntity.class));
	}

}
