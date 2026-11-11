package pl.saldo.shared.security;

public final class PasswordPolicy {

	public static final int MIN_LENGTH = 8;
	public static final int MAX_LENGTH = 64;
	public static final int BCRYPT_MAX_BYTES = 72;

	public static final String LENGTH_MESSAGE = "Hasło musi mieć od 8 do 64 znaków";
	public static final String DIGIT_MESSAGE = "Hasło musi zawierać co najmniej jedną cyfrę";
	public static final String UPPERCASE_MESSAGE = "Hasło musi zawierać co najmniej jedną wielką literę";
	public static final String SPECIAL_MESSAGE = "Hasło musi zawierać co najmniej jeden znak specjalny";
	public static final String TOO_MANY_BYTES_MESSAGE =
			"Hasło jest zbyt długie. Skróć je albo użyj mniejszej liczby polskich liter i znaków specjalnych";

	public static final String DIGIT_REGEX = "(?s).*\\d.*";
	public static final String UPPERCASE_REGEX = "(?s).*\\p{Lu}.*";
	public static final String SPECIAL_REGEX = "(?s).*[^\\p{L}\\p{N}\\s].*";

	private PasswordPolicy() {
	}

}
