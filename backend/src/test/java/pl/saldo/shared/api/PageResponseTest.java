package pl.saldo.shared.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class PageResponseTest {

	@Test
	void shouldMapContentAndCopyPageMetadata() {
		PageImpl<Integer> page = new PageImpl<>(List.of(1, 2), PageRequest.of(1, 2), 5);

		PageResponse<String> response = PageResponse.fromPage(page, String::valueOf);

		assertThat(response.content()).containsExactly("1", "2");
		assertThat(response.page()).isEqualTo(1);
		assertThat(response.size()).isEqualTo(2);
		assertThat(response.totalElements()).isEqualTo(5);
		assertThat(response.totalPages()).isEqualTo(3);
	}

	@Test
	void shouldReturnEmptyContentAndZeroTotalsForEmptyPage() {
		PageImpl<Integer> page = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);

		PageResponse<String> response = PageResponse.fromPage(page, String::valueOf);

		assertThat(response.content()).isEmpty();
		assertThat(response.page()).isZero();
		assertThat(response.size()).isEqualTo(20);
		assertThat(response.totalElements()).isZero();
		assertThat(response.totalPages()).isZero();
	}

	@Test
	void shouldKeepContentImmutable() {
		PageResponse<String> response = new PageResponse<>(List.of("a"), 0, 20, 1, 1);

		assertThatThrownBy(() -> response.content().add("b")).isInstanceOf(UnsupportedOperationException.class);
	}

}
