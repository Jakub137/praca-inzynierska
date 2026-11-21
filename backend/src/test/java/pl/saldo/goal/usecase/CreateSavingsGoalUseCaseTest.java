package pl.saldo.goal.usecase;

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
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import pl.saldo.goal.api.SavingsGoalResponse;
import pl.saldo.goal.domain.GoalStatus;
import pl.saldo.goal.domain.InvalidSavingsGoalException;
import pl.saldo.goal.domain.SavingsGoalEntity;
import pl.saldo.goal.infrastructure.SavingsGoalRepository;

@ExtendWith(MockitoExtension.class)
class CreateSavingsGoalUseCaseTest {

	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final Long GENERATED_ID = 42L;
	// 11:00 on 2026-11-20 in Warsaw.
	private static final Instant NOW = Instant.parse("2026-11-20T10:00:00Z");
	private static final LocalDate TARGET_DATE = LocalDate.of(2027, 7, 15);

	@Mock
	private SavingsGoalRepository savingsGoalRepository;

	private CreateSavingsGoalUseCase useCase;

	@BeforeEach
	void setUp() {
		useCase = new CreateSavingsGoalUseCase(savingsGoalRepository, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	@Test
	void shouldSaveGoalWithZeroProgressAndReturnComputedResponse() {
		given(savingsGoalRepository.save(any(SavingsGoalEntity.class))).willAnswer(invocation -> {
			SavingsGoalEntity saved = invocation.getArgument(0);
			ReflectionTestUtils.setField(saved, "id", GENERATED_ID);
			return saved;
		});

		SavingsGoalResponse response = useCase.execute(
				USER_ID, new SavingsGoalCommand("  Wakacje we Włoszech ", new BigDecimal("6000"), TARGET_DATE));

		ArgumentCaptor<SavingsGoalEntity> captor = ArgumentCaptor.forClass(SavingsGoalEntity.class);
		then(savingsGoalRepository).should().save(captor.capture());
		SavingsGoalEntity saved = captor.getValue();
		assertThat(saved.getUserId()).isEqualTo(USER_ID);
		assertThat(saved.getName()).isEqualTo("Wakacje we Włoszech");
		assertThat(saved.getTargetAmount()).isEqualTo(new BigDecimal("6000.00"));
		assertThat(saved.getCurrentAmount()).isEqualTo(new BigDecimal("0.00"));
		assertThat(saved.getTargetDate()).isEqualTo(TARGET_DATE);
		assertThat(saved.getCreatedAt()).isEqualTo(NOW);
		assertThat(response).isEqualTo(new SavingsGoalResponse(
				GENERATED_ID, "Wakacje we Włoszech", new BigDecimal("6000.00"), new BigDecimal("0.00"), TARGET_DATE,
				GoalStatus.ACTIVE, 7, new BigDecimal("857.15")));
	}

	@Test
	void shouldRejectDeadlineThatIsTodayAndSaveNothing() {
		SavingsGoalCommand command = new SavingsGoalCommand("Cel", new BigDecimal("100.00"), LocalDate.of(2026, 11, 20));

		assertThatThrownBy(() -> useCase.execute(USER_ID, command)).isInstanceOf(InvalidSavingsGoalException.class);

		then(savingsGoalRepository).shouldHaveNoInteractions();
	}

}
