package pl.saldo.shared.api;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

public record PageResponse<T>(
		List<T> content,
		int page,
		int size,
		long totalElements,
		int totalPages) {

	public PageResponse {
		content = List.copyOf(content);
	}

	// page is zero-based, exactly as in Spring Data.
	public static <S, T> PageResponse<T> fromPage(Page<S> page, Function<? super S, ? extends T> mapper) {
		List<T> content = page.getContent().stream().<T>map(mapper).toList();
		return new PageResponse<>(
				content,
				page.getNumber(),
				page.getSize(),
				page.getTotalElements(),
				page.getTotalPages());
	}

}
