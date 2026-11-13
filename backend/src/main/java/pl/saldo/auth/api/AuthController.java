package pl.saldo.auth.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import pl.saldo.auth.usecase.RegisterUserCommand;
import pl.saldo.auth.usecase.RegisterUserUseCase;
import pl.saldo.user.api.UserResponse;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Auth", description = "Rejestracja i uwierzytelnianie użytkowników")
public class AuthController {

	private final RegisterUserUseCase registerUserUseCase;

	public AuthController(RegisterUserUseCase registerUserUseCase) {
		this.registerUserUseCase = registerUserUseCase;
	}

	@PostMapping("/register")
	@Operation(
			summary = "Rejestracja nowego użytkownika",
			description = "Tworzy konto z walutą domyślną PLN. Odpowiedź nie zawiera hasła ani jego skrótu.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "201",
					description = "Konto zostało utworzone",
					content = @Content(schema = @Schema(implementation = UserResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Nieprawidłowe dane (pusty lub błędny e-mail, hasło niezgodne z polityką, "
							+ "zbyt długie imię lub nazwisko). Lista błędów pól w polu fieldErrors.",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "409",
					description = "Adres e-mail jest już zajęty przez inne konto",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterUserCommand command) {
		return ResponseEntity.status(HttpStatus.CREATED).body(registerUserUseCase.execute(command));
	}

}
