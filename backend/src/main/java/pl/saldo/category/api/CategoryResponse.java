package pl.saldo.category.api;

import com.fasterxml.jackson.annotation.JsonProperty;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.transaction.domain.TransactionType;

public record CategoryResponse(
		Long id,
		String name,
		String icon,
		TransactionType type,
		@JsonProperty("isDefault") boolean isDefault) {

	public static CategoryResponse fromEntity(CategoryEntity category) {
		return new CategoryResponse(
				category.getId(),
				category.getName(),
				category.getIcon(),
				category.getType(),
				category.isDefault());
	}

}
