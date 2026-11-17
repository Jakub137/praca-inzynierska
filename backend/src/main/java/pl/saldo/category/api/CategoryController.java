package pl.saldo.category.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import pl.saldo.category.usecase.CreateCategoryCommand;
import pl.saldo.category.usecase.CreateCategoryUseCase;
import pl.saldo.category.usecase.GetCategoriesUseCase;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/categories")
@Tag(name = "Categories", description = "Kategorie transakcji")
public class CategoryController {

	private final GetCategoriesUseCase getCategoriesUseCase;
	private final CreateCategoryUseCase createCategoryUseCase;

	public CategoryController(GetCategoriesUseCase getCategoriesUseCase, CreateCategoryUseCase createCategoryUseCase) {
		this.getCategoriesUseCase = getCategoriesUseCase;
		this.createCategoryUseCase = createCategoryUseCase;
	}

	@GetMapping
	@Operation(
			summary = "Lista kategorii użytkownika",
			description = "Zwraca kategorie systemowe oraz własne kategorie zalogowanego użytkownika. "
					+ "Najpierw wydatki, potem przychody, w grupie alfabetycznie po polsku. "
					+ "Pole icon może być puste (kategorie użytkownika).")
	@ApiResponses({
			@ApiResponse(
					responseCode = "200",
					description = "Kategorie dostępne dla użytkownika",
					content = @Content(array = @ArraySchema(schema = @Schema(implementation = CategoryResponse.class)))),
			@ApiResponse(
					responseCode = "401",
					description = "Brak tokena, token nieprawidłowy lub wygasły",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<List<CategoryResponse>> getCategories(@AuthenticationPrincipal UserPrincipal principal) {
		return ResponseEntity.ok(getCategoriesUseCase.execute(principal.id()));
	}

	@PostMapping
	@Operation(
			summary = "Utworzenie własnej kategorii",
			description = "Tworzy kategorię przypisaną do zalogowanego użytkownika (bez ikony). Nazwa jest przycinana "
					+ "ze spacji. Duplikatem jest nazwa taka sama (bez względu na wielkość liter) jak kategoria "
					+ "systemowa albo własna tego samego typu.")
	@ApiResponses({
			@ApiResponse(
					responseCode = "201",
					description = "Kategoria została utworzona",
					content = @Content(schema = @Schema(implementation = CategoryResponse.class))),
			@ApiResponse(
					responseCode = "400",
					description = "Pusta lub zbyt długa nazwa, brak typu albo nieznany typ. "
							+ "Lista błędów pól w polu fieldErrors.",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "401",
					description = "Brak tokena, token nieprawidłowy lub wygasły",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(
					responseCode = "409",
					description = "Kategoria o tej nazwie już istnieje",
					content = @Content(
							mediaType = "application/problem+json",
							schema = @Schema(implementation = ProblemDetail.class)))
	})
	public ResponseEntity<CategoryResponse> createCategory(@AuthenticationPrincipal UserPrincipal principal,
			@Valid @RequestBody CreateCategoryCommand command) {
		return ResponseEntity.status(HttpStatus.CREATED).body(createCategoryUseCase.execute(principal.id(), command));
	}

}
