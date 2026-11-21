package pl.saldo.recurring.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.recurring.api.RecurringPaymentResponse;
import pl.saldo.recurring.domain.InvalidRecurringPaymentException;
import pl.saldo.recurring.domain.PaymentFrequency;
import pl.saldo.recurring.domain.RecurringPaymentCategoryNotExpenseException;
import pl.saldo.recurring.domain.RecurringPaymentEntity;
import pl.saldo.recurring.infrastructure.RecurringPaymentRepository;
import pl.saldo.shared.error.ResourceNotFoundException;
import pl.saldo.transaction.domain.TransactionType;

@ExtendWith(MockitoExtension.class)
class CreateRecurringPaymentUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Long CATEGORY_ID = 5L;
	private static final Long GENERATED_ID = 42L;
	private static final String CATEGORY_NAME = "Testowa";
	// 11:00 on 2026-11-20 in Warsaw.
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");
	// 00:30 on 2026-11-21 in Warsaw, but still 2026-11-20 in UTC.
	private static final Instant AFTER_UTC_EVENING = Instant.parse("2026-11-20T23:30:00Z");
	private static final LocalDate TODAY = LocalDate.of(2026, 11, 20);
	private static final LocalDate DUE_DATE = LocalDate.of(2026, 12, 1);

	@Mock
	private RecurringPaymentRepository recurringPaymentRepository;

	@Mock
	private CategoryRepository categoryRepository;

	private CreateRecurringPaymentUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = useCaseAt(NOW);
	}

	@Test
	void shouldSaveStrippedPaymentWithNormalizedAmountAndReturnResponse() {
		givenCategory(TransactionType.EXPENSE);
		givenSaveAssignsId();

		RecurringPaymentResponse response = useCase.execute(USER_ID, command("  Netflix ", new BigDecimal("43"), DUE_DATE));

		ArgumentCaptor<RecurringPaymentEntity> captor = ArgumentCaptor.forClass(RecurringPaymentEntity.class);
		then(recurringPaymentRepository).should().save(captor.capture());
		RecurringPaymentEntity saved = captor.getValue();
		assertThat(saved.getUserId()).isEqualTo(USER_ID);
		assertThat(saved.getName()).isEqualTo("Netflix");
		assertThat(saved.getAmount()).isEqualTo(new BigDecimal("43.00"));
		assertThat(saved.getCurrency()).isEqualTo(SupportedCurrency.PLN);
		assertThat(saved.getFrequency()).isEqualTo(PaymentFrequency.MONTHLY);
		assertThat(saved.getNextDueDate()).isEqualTo(DUE_DATE);
		assertThat(saved.getCategory().getId()).isEqualTo(CATEGORY_ID);
		assertThat(saved.getCreatedAt()).isEqualTo(NOW);
		assertThat(response).isEqualTo(new RecurringPaymentResponse(
				GENERATED_ID, "Netflix", new BigDecimal("43.00"), SupportedCurrency.PLN, PaymentFrequency.MONTHLY,
				DUE_DATE, CATEGORY_ID, CATEGORY_NAME));
	}

	@Test
	void shouldAcceptDueDateToday() {
		givenCategory(TransactionType.EXPENSE);
		givenSaveAssignsId();

		RecurringPaymentResponse response = useCase.execute(USER_ID, command("Czynsz", new BigDecimal("850.00"), TODAY));

		assertThat(response.nextDueDate()).isEqualTo(TODAY);
	}

	@Test
	void shouldAcceptTheBusinessDayAfterUtcEvening() {
		useCase = useCaseAt(AFTER_UTC_EVENING);
		givenCategory(TransactionType.EXPENSE);
		givenSaveAssignsId();

		RecurringPaymentResponse response = useCase.execute(
				USER_ID, command("Czynsz", new BigDecimal("850.00"), LocalDate.of(2026, 11, 21)));

		assertThat(response.nextDueDate()).isEqualTo(LocalDate.of(2026, 11, 21));
	}

	@Test
	void shouldRejectTheUtcDayThatIsAlreadyPastInBusinessZoneAndTouchNothing() {
		useCase = useCaseAt(AFTER_UTC_EVENING);

		assertThatThrownBy(() -> useCase.execute(
				USER_ID, command("Czynsz", new BigDecimal("850.00"), LocalDate.of(2026, 11, 20))))
				.isInstanceOf(InvalidRecurringPaymentException.class);

		then(recurringPaymentRepository).shouldHaveNoInteractions();
		then(categoryRepository).shouldHaveNoInteractions();
	}

	@Test
	void shouldThrowNotFoundAndSaveNothingWhenCategoryIsMissingOrForeign() {
		given(categoryRepository.findAccessibleById(CATEGORY_ID, USER_ID)).willReturn(Optional.empty());

		assertThatThrownBy(() -> useCase.execute(USER_ID, command("Netflix", new BigDecimal("43.00"), DUE_DATE)))
				.isInstanceOf(ResourceNotFoundException.class);

		then(recurringPaymentRepository).shouldHaveNoInteractions();
	}

	@Test
	void shouldThrowAndSaveNothingWhenCategoryIsIncome() {
		givenCategory(TransactionType.INCOME);

		assertThatThrownBy(() -> useCase.execute(USER_ID, command("Netflix", new BigDecimal("43.00"), DUE_DATE)))
				.isInstanceOf(RecurringPaymentCategoryNotExpenseException.class);

		then(recurringPaymentRepository).shouldHaveNoInteractions();
	}

	private CreateRecurringPaymentUseCase useCaseAt(Instant now) {
		return new CreateRecurringPaymentUseCase(
				recurringPaymentRepository, categoryRepository, Clock.fixed(now, ZoneOffset.UTC));
	}

	private void givenCategory(TransactionType type) {
		CategoryEntity category = new CategoryEntity(USER_ID, CATEGORY_NAME, null, type);
		ReflectionTestUtils.setField(category, "id", CATEGORY_ID);
		given(categoryRepository.findAccessibleById(CATEGORY_ID, USER_ID)).willReturn(Optional.of(category));
	}

	private void givenSaveAssignsId() {
		given(recurringPaymentRepository.save(any(RecurringPaymentEntity.class))).willAnswer(invocation -> {
			RecurringPaymentEntity saved = invocation.getArgument(0);
			ReflectionTestUtils.setField(saved, "id", GENERATED_ID);
			return saved;
		});
	}

	private static RecurringPaymentCommand command(String name, BigDecimal amount, LocalDate nextDueDate) {
		return new RecurringPaymentCommand(
				name, amount, SupportedCurrency.PLN, PaymentFrequency.MONTHLY, nextDueDate, CATEGORY_ID);
	}

}
