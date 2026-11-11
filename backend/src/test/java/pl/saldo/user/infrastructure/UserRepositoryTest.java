package pl.saldo.user.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import pl.saldo.TestcontainersConfiguration;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.user.domain.UserEntity;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
class UserRepositoryTest {

	private static final String EMAIL = "Jan.Kowalski@Example.com";
	private static final Instant NOW = Instant.parse("2026-11-11T10:15:30Z");

	private final UserRepository userRepository;
	private final EntityManager entityManager;

	@Autowired
	UserRepositoryTest(UserRepository userRepository, EntityManager entityManager) {
		this.userRepository = userRepository;
		this.entityManager = entityManager;
	}

	@Test
	void shouldPersistAndReloadAllColumns() {
		UserEntity saved = userRepository.saveAndFlush(newUser(EMAIL));
		entityManager.clear();

		UserEntity loaded = userRepository.findById(saved.getId()).orElseThrow();

		assertThat(loaded.getId()).isNotNull();
		assertThat(loaded.getEmail()).isEqualTo(EMAIL);
		assertThat(loaded.getPasswordHash()).isEqualTo("hash");
		assertThat(loaded.getFirstName()).isEqualTo("Jan");
		assertThat(loaded.getLastName()).isEqualTo("Kowalski");
		assertThat(loaded.getDefaultCurrency()).isEqualTo(SupportedCurrency.PLN);
		assertThat(loaded.getCreatedAt()).isEqualTo(NOW);
		assertThat(loaded.getUpdatedAt()).isEqualTo(NOW);
	}

	@Test
	void shouldFindByEmailIgnoringCase() {
		userRepository.saveAndFlush(newUser(EMAIL));

		assertThat(userRepository.findByEmailIgnoreCase("jan.kowalski@example.COM")).isPresent();
	}

	@Test
	void shouldReturnEmptyWhenEmailIsUnknown() {
		assertThat(userRepository.findByEmailIgnoreCase("nobody@example.com")).isEmpty();
	}

	@Test
	void shouldReportExistenceIgnoringCase() {
		userRepository.saveAndFlush(newUser(EMAIL));

		assertThat(userRepository.existsByEmailIgnoreCase("JAN.KOWALSKI@example.com")).isTrue();
		assertThat(userRepository.existsByEmailIgnoreCase("nobody@example.com")).isFalse();
	}

	@Test
	void shouldRejectEmailDuplicatedWithDifferentCase() {
		userRepository.saveAndFlush(newUser(EMAIL));
		UserEntity duplicate = newUser(EMAIL.toLowerCase());

		assertThatThrownBy(() -> userRepository.saveAndFlush(duplicate))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	private static UserEntity newUser(String email) {
		return new UserEntity(email, "hash", "Jan", "Kowalski", SupportedCurrency.PLN, NOW);
	}

}
