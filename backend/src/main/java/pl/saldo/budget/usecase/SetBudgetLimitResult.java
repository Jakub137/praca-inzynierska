package pl.saldo.budget.usecase;

import pl.saldo.budget.api.BudgetLimitResponse;

public record SetBudgetLimitResult(boolean created, BudgetLimitResponse limit) {

}
