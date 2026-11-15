package pl.saldo.auth.usecase;

import pl.saldo.user.api.UserResponse;

public record LoginResult(String accessToken, long expiresIn, UserResponse user) {

}
