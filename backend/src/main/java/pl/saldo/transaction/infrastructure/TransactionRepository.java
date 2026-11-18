package pl.saldo.transaction.infrastructure;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import pl.saldo.transaction.domain.TransactionEntity;

public interface TransactionRepository extends JpaRepository<TransactionEntity, UUID> {

}
