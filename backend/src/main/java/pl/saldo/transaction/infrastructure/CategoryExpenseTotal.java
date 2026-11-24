package pl.saldo.transaction.infrastructure;

import java.math.BigDecimal;

public record CategoryExpenseTotal(Long categoryId, String categoryName, BigDecimal total) {

}
