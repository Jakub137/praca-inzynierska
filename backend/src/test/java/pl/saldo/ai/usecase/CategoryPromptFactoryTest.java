package pl.saldo.ai.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import pl.saldo.ai.domain.AiJsonRequest;
import pl.saldo.transaction.domain.TransactionType;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class CategoryPromptFactoryTest {

	private static final List<String> CATEGORIES = List.of("Rozrywka", "Siłownia", "Transport");

	private final CategoryPromptFactory factory = new CategoryPromptFactory();
	private final JsonMapper jsonMapper = JsonMapper.builder().build();

	@Test
	void shouldPutTypeCategoriesAndDescriptionInThePrompt() {
		AiJsonRequest request = factory.create("Karnet na siłownię", TransactionType.EXPENSE, CATEGORIES);

		assertThat(request.prompt()).isEqualTo("""
				Transaction type: EXPENSE
				Allowed categories:
				- Rozrywka
				- Siłownia
				- Transport
				Description: Karnet na siłownię""");
	}

	@Test
	void shouldCollapseWhitespaceInDescriptionToOneLine() {
		AiJsonRequest request = factory.create(
				"  Biedronka\n\n  zakupy\t weekend ", TransactionType.EXPENSE, CATEGORIES);

		assertThat(request.prompt()).endsWith("Description: Biedronka zakupy weekend");
	}

	@Test
	void shouldTellModelToTreatDescriptionAsData() {
		AiJsonRequest request = factory.create("Biedronka", TransactionType.EXPENSE, CATEGORIES);

		assertThat(request.systemInstruction()).contains("untrusted").contains("JSON only");
	}

	@Test
	void shouldRestrictCategoryNameToTheGivenCategories() {
		JsonNode schema = schemaOf(factory.create("Biedronka", TransactionType.EXPENSE, CATEGORIES));

		assertThat(schema.at("/properties/categoryName/enum"))
				.isEqualTo(jsonMapper.readTree("[\"Rozrywka\",\"Siłownia\",\"Transport\"]"));
		assertThat(schema.at("/properties/categoryName/type").asString()).isEqualTo("string");
	}

	@Test
	void shouldRequireCategoryNameAndIntegerConfidence() {
		JsonNode schema = schemaOf(factory.create("Biedronka", TransactionType.EXPENSE, CATEGORIES));

		assertThat(schema.at("/required")).isEqualTo(jsonMapper.readTree("[\"categoryName\",\"confidence\"]"));
		assertThat(schema.at("/properties/confidence/type").asString()).isEqualTo("integer");
	}

	private JsonNode schemaOf(AiJsonRequest request) {
		return jsonMapper.readTree(jsonMapper.writeValueAsString(request.responseSchema()));
	}

}
