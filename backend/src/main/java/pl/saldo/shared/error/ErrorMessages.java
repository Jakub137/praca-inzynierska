package pl.saldo.shared.error;

public final class ErrorMessages {

	public record Text(String title, String detail) {

	}

	public static final Text VALIDATION = new Text(
			"Błąd walidacji",
			"Dane formularza są nieprawidłowe. Popraw zaznaczone pola.");
	public static final Text EMAIL_TAKEN = new Text(
			"Konflikt danych",
			"Adres e-mail jest już zajęty przez inne konto");
	public static final Text CATEGORY_EXISTS = new Text(
			"Konflikt danych",
			"Kategoria o tej nazwie już istnieje.");
	public static final Text INTERNAL = new Text(
			"Błąd serwera",
			"Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");
	public static final Text UNAUTHORIZED = new Text(
			"Brak autoryzacji",
			"Wymagane jest zalogowanie. Zaloguj się ponownie.");
	public static final Text INVALID_CREDENTIALS = new Text(
			"Nieudane logowanie",
			"Nieprawidłowy adres e-mail lub hasło.");
	public static final Text FORBIDDEN = new Text(
			"Brak dostępu",
			"Nie masz uprawnień do wykonania tej operacji.");
	public static final Text CATEGORY_TYPE_MISMATCH = new Text(
			"Nieprawidłowa kategoria",
			"Typ kategorii nie zgadza się z typem transakcji. Wybierz kategorię wydatków dla wydatku albo kategorię przychodów dla przychodu.");
	public static final Text AMOUNT_PLN_LIMIT_EXCEEDED = new Text(
			"Błąd walidacji",
			"Kwota po przeliczeniu na PLN przekracza dopuszczalny limit. Wpisz mniejszą kwotę.");
	public static final Text EXCHANGE_RATE_UNAVAILABLE = new Text(
			"Usługa niedostępna",
			"Nie udało się pobrać kursu waluty. Spróbuj ponownie za chwilę albo wybierz walutę PLN.");

	private static final Text BAD_REQUEST = new Text(
			"Nieprawidłowe żądanie",
			"Nie można odczytać żądania. Sprawdź format przesyłanych danych.");
	private static final Text NOT_FOUND = new Text(
			"Nie znaleziono zasobu",
			"Żądany zasób nie istnieje.");
	private static final Text METHOD_NOT_ALLOWED = new Text(
			"Metoda niedozwolona",
			"Ta metoda HTTP nie jest obsługiwana dla tego adresu.");
	private static final Text NOT_ACCEPTABLE = new Text(
			"Nieobsługiwany format odpowiedzi",
			"Serwer zwraca odpowiedzi tylko w formacie JSON.");
	private static final Text UNSUPPORTED_MEDIA_TYPE = new Text(
			"Nieobsługiwany format danych",
			"Serwer przyjmuje dane tylko w formacie JSON.");
	private static final Text FALLBACK = new Text(
			"Błąd żądania",
			"Nie udało się przetworzyć żądania.");

	private ErrorMessages() {
	}

	public static Text forStatus(int status) {
		return switch (status) {
			case 400 -> BAD_REQUEST;
			case 401 -> UNAUTHORIZED;
			case 403 -> FORBIDDEN;
			case 404 -> NOT_FOUND;
			case 405 -> METHOD_NOT_ALLOWED;
			case 406 -> NOT_ACCEPTABLE;
			case 415 -> UNSUPPORTED_MEDIA_TYPE;
			case 500 -> INTERNAL;
			default -> FALLBACK;
		};
	}

}
