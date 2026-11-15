package pl.saldo.auth.api;

import pl.saldo.auth.usecase.LoginResult;

public record AuthResponse(String accessToken, long expiresIn, AuthUserResponse user) {

	public static AuthResponse fromResult(LoginResult result) {
		return new AuthResponse(
				result.accessToken(),
				result.expiresIn(),
				AuthUserResponse.fromUserResponse(result.user()));
	}

	// The default record toString would print the JWT; the response must never leak into logs.
	@Override
	public String toString() {
		return "AuthResponse[accessToken=***, expiresIn=" + expiresIn + ", user=" + user + "]";
	}

}
