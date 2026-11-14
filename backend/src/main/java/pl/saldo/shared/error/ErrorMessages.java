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
	public static final Text INTERNAL = new Text(
			"Błąd serwera",
			"Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");

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
			case 404 -> NOT_FOUND;
			case 405 -> METHOD_NOT_ALLOWED;
			case 406 -> NOT_ACCEPTABLE;
			case 415 -> UNSUPPORTED_MEDIA_TYPE;
			case 500 -> INTERNAL;
			default -> FALLBACK;
		};
	}

}
