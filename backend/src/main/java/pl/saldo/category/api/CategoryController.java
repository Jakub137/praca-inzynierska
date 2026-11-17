package pl.saldo.category.api;

import java.util.List;

import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import pl.saldo.category.usecase.GetCategoriesUseCase;
import pl.saldo.shared.security.UserPrincipal;

@RestController
@RequestMapping("/api/v1/categories")
@Tag(name = "Categories", description = "Kategorie transakcji")
public class CategoryController {

	private final GetCategoriesUseCase getCategoriesUseCase;

	public CategoryController(GetCategoriesUseCase getCategoriesUseCase) {
		this.getCategoriesUseCase = getCategoriesUseCase;
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

}
