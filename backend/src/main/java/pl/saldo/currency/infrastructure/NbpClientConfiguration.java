package pl.saldo.currency.infrastructure;

import java.time.Clock;
import java.time.Duration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration(proxyBeanMethods = false)
public class NbpClientConfiguration {

	private static final String NBP_BASE_URL = "https://api.nbp.pl";
	private static final Duration NBP_REQUEST_TIMEOUT = Duration.ofSeconds(5);

	@Bean
	public NbpExchangeRateProvider nbpExchangeRateProvider(WebClient.Builder webClientBuilder, Clock clock) {
		WebClient webClient = webClientBuilder.baseUrl(NBP_BASE_URL).build();
		return new NbpExchangeRateProvider(webClient, clock, NBP_REQUEST_TIMEOUT);
	}

}
