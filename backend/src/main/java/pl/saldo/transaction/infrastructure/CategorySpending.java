package pl.saldo.transaction.infrastructure;

import java.math.BigDecimal;

public record CategorySpending(Long categoryId, BigDecimal total) {

}
