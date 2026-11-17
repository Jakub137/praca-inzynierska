package pl.saldo.category.infrastructure;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import pl.saldo.category.domain.CategoryEntity;

public interface CategoryRepository extends JpaRepository<CategoryEntity, Long> {

	List<CategoryEntity> findAllByUserIdOrIsDefaultTrue(UUID userId, Sort sort);

}
