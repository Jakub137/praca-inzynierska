package pl.saldo.shared.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

@ConfigurationProperties("app.cors")
@Validated
public record CorsProperties(@NotBlank String allowedOrigin) {

}
