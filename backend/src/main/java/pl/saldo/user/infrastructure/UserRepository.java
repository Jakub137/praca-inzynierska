package pl.saldo.user.infrastructure;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import pl.saldo.user.domain.UserEntity;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

	boolean existsByEmailIgnoreCase(String email);

	Optional<UserEntity> findByEmailIgnoreCase(String email);

}
