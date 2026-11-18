package pl.saldo.transaction.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.shared.api.PageResponse;
import pl.saldo.transaction.api.TransactionResponse;
import pl.saldo.transaction.domain.TransactionEntity;
import pl.saldo.transaction.domain.TransactionType;
import pl.saldo.transaction.infrastructure.TransactionRepository;

@ExtendWith(MockitoExtension.class)
class GetTransactionsUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Instant NOW = Instant.parse("2026-11-17T10:00:00Z");

	@Mock
	private TransactionRepository transactionRepository;

	@InjectMocks
	private GetTransactionsUseCase useCase;

	@Test
	void shouldMapPageToResponseAndKeepMetadata() {
		GetTransactionsQuery query = GetTransactionsQuery.of(1, 2, null, null, null, null, null, null);
		PageImpl<TransactionEntity> page = new PageImpl<>(List.of(transaction()), query.toPageable(), 5);
		given(transactionRepository.findAll(
				ArgumentMatchers.<Specification<TransactionEntity>>any(), eq(query.toPageable()))).willReturn(page);

		PageResponse<TransactionResponse> response = useCase.execute(USER_ID, query);

		assertThat(response.content()).extracting(TransactionResponse::categoryName).containsExactly("Transport");
		assertThat(response.content()).extracting(TransactionResponse::amountPln)
				.containsExactly(new BigDecimal("45.15"));
		assertThat(response.page()).isEqualTo(1);
		assertThat(response.size()).isEqualTo(2);
		assertThat(response.totalElements()).isEqualTo(5);
		assertThat(response.totalPages()).isEqualTo(3);
	}

	@Test
	void shouldReturnEmptyPageWhenNothingMatches() {
		GetTransactionsQuery query = GetTransactionsQuery.of(null, null, null, null, null, null, null, null);
		given(transactionRepository.findAll(
				ArgumentMatchers.<Specification<TransactionEntity>>any(), eq(query.toPageable())))
				.willReturn(new PageImpl<>(List.of(), query.toPageable(), 0));

		PageResponse<TransactionResponse> response = useCase.execute(USER_ID, query);

		assertThat(response.content()).isEmpty();
		assertThat(response.totalElements()).isZero();
		assertThat(response.totalPages()).isZero();
	}

	private static TransactionEntity transaction() {
		CategoryEntity category = new CategoryEntity(null, "Transport", "car", TransactionType.EXPENSE);
		ReflectionTestUtils.setField(category, "id", 5L);
		TransactionEntity transaction = new TransactionEntity(
				USER_ID, category, new BigDecimal("10.50"), SupportedCurrency.EUR, new BigDecimal("45.15"),
				new BigDecimal("4.3000"), LocalDate.of(2026, 11, 14), "Bilety", TransactionType.EXPENSE, NOW);
		ReflectionTestUtils.setField(transaction, "id", UUID.fromString("22222222-2222-2222-2222-222222222222"));
		return transaction;
	}

}
