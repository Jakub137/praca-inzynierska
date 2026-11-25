package pl.saldo.transaction.infrastructure;

import java.math.BigDecimal;

import pl.saldo.transaction.domain.TransactionType;

public record MonthlyTypeTotal(Integer year, Integer month, TransactionType type, BigDecimal total) {

}
