package pl.saldo.health.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.context.annotation.Import;
import pl.saldo.shared.config.ClockConfiguration;

import pl.saldo.health.usecase.GetHealthUseCase;

@WebMvcTest(HealthController.class)
@Import(ClockConfiguration.class)
class HealthControllerTest {

	private static final Instant FIXED_TIME = Instant.parse("2026-01-01T12:00:00Z");

	@Autowired
	private MockMvcTester mvc;

	@MockitoBean
	private GetHealthUseCase getHealthUseCase;

	@Test
	void shouldReturnStatusUpAndUtcTimestamp() {
		given(getHealthUseCase.execute())
				.willReturn(new HealthResponse(HealthResponse.Status.UP, FIXED_TIME));

		assertThat(mvc.get().uri("/api/v1/health"))
				.hasStatusOk()
				.bodyJson()
				.isLenientlyEqualTo("""
						{"status":"UP","timestamp":"2026-01-01T12:00:00Z"}
						""");
	}

}
