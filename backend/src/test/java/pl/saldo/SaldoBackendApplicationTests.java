package pl.saldo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SaldoBackendApplicationTests {

	private static final String ICU_PROVIDER = "i";

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void contextLoads() {
	}

	@Test
	void shouldUseIcuLocaleProvider() {
		String provider = jdbcTemplate.queryForObject(
				"SELECT datlocprovider::text FROM pg_database WHERE datname = current_database()",
				String.class);

		assertThat(provider).isEqualTo(ICU_PROVIDER);
	}

}