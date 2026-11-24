package pl.saldo.ai.usecase;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import pl.saldo.ai.domain.AiClient;
import pl.saldo.ai.domain.AiJsonRequest;
import pl.saldo.ai.domain.AiUnavailableException;
import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.category.infrastructure.CategoryRepository;
import pl.saldo.transaction.domain.TransactionType;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

// Deliberately not @Transactional: the AI call must not run inside an open database transaction.
@Service
public class SuggestCategoryUseCase {

	private static final Logger log = LoggerFactory.getLogger(SuggestCategoryUseCase.class);

	static final int MIN_AI_CONFIDENCE = 60;
	static final int KEYWORD_CONFIDENCE = 60;
	private static final int MAX_CONFIDENCE = 100;
	private static final Sort CATEGORY_ORDER = Sort.by(CategoryEntity::getName, CategoryEntity::getId);

	private final AiClient aiClient;
	private final CategoryRepository categoryRepository;
	private final CategoryPromptFactory promptFactory;
	private final CategoryKeywordMatcher keywordMatcher;
	private final JsonMapper jsonMapper;

	public SuggestCategoryUseCase(
			AiClient aiClient,
			CategoryRepository categoryRepository,
			CategoryPromptFactory promptFactory,
			CategoryKeywordMatcher keywordMatcher,
			JsonMapper jsonMapper) {
		this.aiClient = aiClient;
		this.categoryRepository = categoryRepository;
		this.promptFactory = promptFactory;
		this.keywordMatcher = keywordMatcher;
		this.jsonMapper = jsonMapper;
	}

	public Optional<CategorySuggestion> execute(UUID userId, String description, TransactionType type) {
		Objects.requireNonNull(userId, "userId");
		Objects.requireNonNull(type, "type");
		if (description == null || description.isBlank()) {
			return Optional.empty();
		}
		Map<String, Long> idsByName = loadCategoryIds(userId, type);
		if (idsByName.isEmpty()) {
			return Optional.empty();
		}
		return askAi(description, type, idsByName)
				.or(() -> matchKeywords(description, type, idsByName));
	}

	private Map<String, Long> loadCategoryIds(UUID userId, TransactionType type) {
		return categoryRepository.findAllByUserIdOrIsDefaultTrue(userId, CATEGORY_ORDER).stream()
				.filter(category -> category.getType() == type)
				.collect(Collectors.toMap(
						CategoryEntity::getName, CategoryEntity::getId, (first, second) -> first, LinkedHashMap::new));
	}

	private Optional<CategorySuggestion> askAi(String description, TransactionType type, Map<String, Long> idsByName) {
		AiJsonRequest request = promptFactory.create(description, type, List.copyOf(idsByName.keySet()));
		try {
			AiCategoryAnswer answer = jsonMapper.readValue(aiClient.generateJson(request), AiCategoryAnswer.class);
			return toSuggestion(answer, idsByName);
		} catch (AiUnavailableException e) {
			return Optional.empty();
		} catch (JacksonException e) {
			log.warn("AI answer does not match the expected shape ({})", e.getClass().getSimpleName());
			return Optional.empty();
		}
	}

	private Optional<CategorySuggestion> toSuggestion(AiCategoryAnswer answer, Map<String, Long> idsByName) {
		Long categoryId = answer.categoryName() == null ? null : idsByName.get(answer.categoryName());
		boolean confident = answer.confidence() != null
				&& answer.confidence() >= MIN_AI_CONFIDENCE
				&& answer.confidence() <= MAX_CONFIDENCE;
		if (categoryId == null || !confident) {
			log.info("AI suggestion rejected: unknown category or confidence outside {}-{}",
					MIN_AI_CONFIDENCE, MAX_CONFIDENCE);
			return Optional.empty();
		}
		return Optional.of(new CategorySuggestion(
				categoryId, answer.categoryName(), answer.confidence(), CategorySuggestion.Source.AI));
	}

	private Optional<CategorySuggestion> matchKeywords(
			String description, TransactionType type, Map<String, Long> idsByName) {
		return keywordMatcher.match(description, type)
				.filter(idsByName::containsKey)
				.map(name -> new CategorySuggestion(
						idsByName.get(name), name, KEYWORD_CONFIDENCE, CategorySuggestion.Source.KEYWORDS));
	}

	record AiCategoryAnswer(String categoryName, Integer confidence) {
	}

}
