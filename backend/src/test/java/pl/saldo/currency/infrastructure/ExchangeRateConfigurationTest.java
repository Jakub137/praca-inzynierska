package pl.saldo.currency.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.web.reactive.function.client.WebClient;

import pl.saldo.currency.domain.ExchangeRateProvider;

class ExchangeRateConfigurationTest {

	@Test
	void shouldInjectResilientProviderAsPrimaryWithoutBeanCycle() {
		try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
			context.registerBean(Clock.class, Clock::systemUTC);
			context.registerBean(WebClient.Builder.class, WebClient::builder);
			context.register(NbpClientConfiguration.class, ExchangeRateConfiguration.class);

			context.refresh();

			assertThat(context.getBean(ExchangeRateProvider.class))
					.isInstanceOf(ResilientExchangeRateProvider.class);
			assertThat(context.getBean(NbpExchangeRateProvider.class)).isNotNull();
			assertThat(context.getBean(FallbackExchangeRateProvider.class)).isNotNull();
			assertThat(context.getBeansOfType(ExchangeRateProvider.class)).hasSize(3);
		}
	}

}
