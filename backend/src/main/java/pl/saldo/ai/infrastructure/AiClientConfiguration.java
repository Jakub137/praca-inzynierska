package pl.saldo.ai.infrastructure;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import pl.saldo.ai.domain.AiClient;
import tools.jackson.databind.json.JsonMapper;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AiProperties.class)
public class AiClientConfiguration {

	@Bean
	public AiClient aiClient(WebClient.Builder webClientBuilder, AiProperties properties, JsonMapper jsonMapper) {
		WebClient webClient = webClientBuilder.baseUrl(properties.baseUrl()).build();
		return new GeminiAiClient(webClient, properties, jsonMapper);
	}

}
