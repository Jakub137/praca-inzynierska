package pl.saldo.transaction.infrastructure;

import java.math.BigDecimal;

import pl.saldo.transaction.domain.TransactionType;

public record TypeTotal(TransactionType type, BigDecimal total) {

}
