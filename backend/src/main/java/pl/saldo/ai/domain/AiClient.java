package pl.saldo.ai.domain;

public interface AiClient {

	/**
	 * Sends the prompt to the AI provider and returns the model answer as a valid JSON text.
	 *
	 * @throws AiUnavailableException on a missing API key, network error, timeout,
	 *                                provider error or an answer that is not valid JSON
	 */
	String generateJson(AiJsonRequest request);

}
