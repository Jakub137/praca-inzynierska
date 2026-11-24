package pl.saldo.ai.usecase;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import pl.saldo.transaction.domain.TransactionType;

@Component
public class CategoryKeywordMatcher {

	private static final Pattern COMBINING_MARKS = Pattern.compile("\\p{M}+");
	private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-z0-9]+");

	// Stems are lower case without Polish diacritics; a stem matches the beginning of a word, so "biedron" covers "Biedronce".
	// Rule order matters: the first matching rule wins ("Obiad po kinie" is a restaurant, not entertainment).
	private static final List<KeywordRule> RULES = List.of(
			new KeywordRule("Artykuły spożywcze", TransactionType.EXPENSE,
					List.of("biedron", "lidl", "zabk", "auchan", "carrefour", "kaufland", "stokrotk", "spozyw", "piekarn")),
			new KeywordRule("Restauracje", TransactionType.EXPENSE,
					List.of("restaur", "pizz", "mcdonald", "kfc", "burger", "kawiarn", "starbucks", "sushi", "kebab",
							"bistro", "obiad")),
			new KeywordRule("Transport", TransactionType.EXPENSE,
					List.of("orlen", "paliw", "benzyn", "uber", "bolt", "taxi", "taksowk", "autobus", "tramwaj", "pkp",
							"parking", "mpk", "jakdojade")),
			new KeywordRule("Rachunki", TransactionType.EXPENSE,
					List.of("prad", "czynsz", "rachun", "internet", "tauron", "pge", "energa", "wodoci", "ubezpiecz",
							"abonament", "telefon")),
			new KeywordRule("Zdrowie", TransactionType.EXPENSE,
					List.of("apote", "lekarz", "dentyst", "szpital", "leki", "recept", "przychodn", "rehabilit")),
			new KeywordRule("Rozrywka", TransactionType.EXPENSE,
					List.of("kino", "kina", "kinie", "netflix", "spotify", "hbo", "disney", "steam", "teatr", "koncert",
							"muzeum")),
			new KeywordRule("Odzież", TransactionType.EXPENSE,
					List.of("zalando", "reserved", "ubrani", "buty", "kurtk", "spodni", "koszul", "sukien", "sinsay",
							"cropp")),
			new KeywordRule("Wynagrodzenie", TransactionType.INCOME, List.of("wyplat", "pensj", "wynagrodz")),
			new KeywordRule("Premia", TransactionType.INCOME, List.of("premi", "bonus", "nagrod")),
			new KeywordRule("Inne przychody", TransactionType.INCOME, List.of("odsetk", "zwrot")));

	public Optional<String> match(String description, TransactionType type) {
		if (description == null || description.isBlank()) {
			return Optional.empty();
		}
		List<String> words = splitIntoWords(description);
		return RULES.stream()
				.filter(rule -> rule.type() == type)
				.filter(rule -> rule.matchesAny(words))
				.map(KeywordRule::categoryName)
				.findFirst();
	}

	Map<String, TransactionType> targetCategories() {
		return RULES.stream().collect(Collectors.toUnmodifiableMap(KeywordRule::categoryName, KeywordRule::type));
	}

	private static List<String> splitIntoWords(String description) {
		String lowerCase = description.toLowerCase(Locale.ROOT);
		String folded = COMBINING_MARKS.matcher(Normalizer.normalize(lowerCase, Normalizer.Form.NFD))
				.replaceAll("")
				.replace('ł', 'l');
		return Arrays.stream(NON_ALPHANUMERIC.split(folded))
				.filter(word -> !word.isEmpty())
				.toList();
	}

	private record KeywordRule(String categoryName, TransactionType type, List<String> stems) {

		boolean matchesAny(List<String> words) {
			return stems.stream().anyMatch(stem -> words.stream().anyMatch(word -> word.startsWith(stem)));
		}

	}

}
