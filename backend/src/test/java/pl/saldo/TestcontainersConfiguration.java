package pl.saldo;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	private static final String POSTGRES_IMAGE = "postgres:16-alpine";
	// Must match POSTGRES_INITDB_ARGS in docker-compose.yml (ADR-006).
	private static final String INITDB_ARGS = "--locale-provider=icu --icu-locale=pl-PL";

	@Bean
	@ServiceConnection
	@SuppressWarnings("resource")
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(DockerImageName.parse(POSTGRES_IMAGE))
				.withEnv("POSTGRES_INITDB_ARGS", INITDB_ARGS);
	}

}
