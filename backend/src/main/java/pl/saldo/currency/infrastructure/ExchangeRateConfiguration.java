package pl.saldo.currency.infrastructure;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import pl.saldo.currency.domain.ExchangeRateProvider;

@Configuration(proxyBeanMethods = false)
public class ExchangeRateConfiguration {

	@Bean
	public FallbackExchangeRateProvider fallbackExchangeRateProvider() {
		return new FallbackExchangeRateProvider();
	}

	@Bean
	@Primary
	public ExchangeRateProvider exchangeRateProvider(NbpExchangeRateProvider nbpProvider,
			FallbackExchangeRateProvider fallbackProvider) {
		return new ResilientExchangeRateProvider(nbpProvider, fallbackProvider);
	}

}
