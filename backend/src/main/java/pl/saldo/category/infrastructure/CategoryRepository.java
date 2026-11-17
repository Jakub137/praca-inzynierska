package pl.saldo.category.infrastructure;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import pl.saldo.category.domain.CategoryEntity;
import pl.saldo.transaction.domain.TransactionType;

public interface CategoryRepository extends JpaRepository<CategoryEntity, Long> {

	List<CategoryEntity> findAllByUserIdOrIsDefaultTrue(UUID userId, Sort sort);

	@Query("""
			select case when count(c) > 0 then true else false end from CategoryEntity c
			where upper(c.name) = upper(:name)
				and c.type = :type
				and (c.userId = :userId or c.isDefault = true)""")
	boolean existsDuplicate(@Param("userId") UUID userId, @Param("name") String name,
			@Param("type") TransactionType type);

}
