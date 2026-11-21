package pl.saldo.goal.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.goal.api.SavingsGoalResponse;
import pl.saldo.goal.domain.SavingsGoalDates;
import pl.saldo.goal.domain.SavingsGoalEntity;
import pl.saldo.goal.infrastructure.SavingsGoalRepository;
import pl.saldo.user.domain.UserEntity;
import pl.saldo.user.infrastructure.UserRepository;

// Deliberately not @Transactional: each thread needs its own committed transaction.
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class DepositToGoalConcurrencyIntegrationTest {

	private static final int TIMEOUT_SECONDS = 10;

	private final DepositToGoalUseCase depositToGoalUseCase;
	private final UserRepository userRepository;
	private final SavingsGoalRepository savingsGoalRepository;
	private final Clock clock;

	private UserEntity user;
	private SavingsGoalEntity goal;

	@Autowired
	DepositToGoalConcurrencyIntegrationTest(DepositToGoalUseCase depositToGoalUseCase, UserRepository userRepository,
			SavingsGoalRepository savingsGoalRepository, Clock clock) {
		this.depositToGoalUseCase = depositToGoalUseCase;
		this.userRepository = userRepository;
		this.savingsGoalRepository = savingsGoalRepository;
		this.clock = clock;
	}

	@BeforeEach
	void setUp() {
		user = userRepository.saveAndFlush(new UserEntity(
				"wspolbieznosc@example.com", "stored-hash", "Jan", "Kowalski", SupportedCurrency.PLN,
				Instant.now(clock)));
		goal = savingsGoalRepository.saveAndFlush(new SavingsGoalEntity(
				user.getId(), "Wakacje", new BigDecimal("6000.00"),
				SavingsGoalDates.today(clock).plusMonths(6), Instant.now(clock)));
	}

	// The goal rows go away with the user (ON DELETE CASCADE in V3_1).
	@AfterEach
	void tearDown() {
		userRepository.deleteById(user.getId());
	}

	// This test confirms the result but does not prove the lock deterministically: without the lock it could
	// occasionally pass too. The guarantee comes from SELECT ... FOR UPDATE (PESSIMISTIC_WRITE).
	@Test
	void shouldApplyBothDepositsWhenTheyRunAtTheSameTime() throws Exception {
		ExecutorService executor = Executors.newFixedThreadPool(2);
		CountDownLatch start = new CountDownLatch(1);
		try {
			Future<SavingsGoalResponse> first = executor.submit(() -> depositAfter(start, "100.00"));
			Future<SavingsGoalResponse> second = executor.submit(() -> depositAfter(start, "250.50"));
			start.countDown();

			// get() rethrows an exception from the thread, so a failure there cannot disappear silently.
			first.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
			second.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
		} finally {
			executor.shutdownNow();
		}

		assertThat(executor.awaitTermination(TIMEOUT_SECONDS, TimeUnit.SECONDS)).isTrue();
		SavingsGoalEntity stored = savingsGoalRepository.findById(goal.getId()).orElseThrow();
		assertThat(stored.getCurrentAmount()).isEqualByComparingTo(new BigDecimal("350.50"));
	}

	private SavingsGoalResponse depositAfter(CountDownLatch start, String amount) throws InterruptedException {
		start.await();
		return depositToGoalUseCase.execute(user.getId(), goal.getId(), new DepositToGoalCommand(new BigDecimal(amount)));
	}

}
