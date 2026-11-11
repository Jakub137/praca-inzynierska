package pl.saldo.user.domain;

public class UserAlreadyExistsException extends RuntimeException {

	public UserAlreadyExistsException() {
		super("User with the given e-mail address already exists");
	}

	public UserAlreadyExistsException(Throwable cause) {
		super("User with the given e-mail address already exists", cause);
	}

}
