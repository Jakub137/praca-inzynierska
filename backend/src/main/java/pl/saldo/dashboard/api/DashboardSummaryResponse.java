package pl.saldo.dashboard.api;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;

public record DashboardSummaryResponse(
		@Schema(description = "Bieżący miesiąc w strefie Europe/Warsaw (RRRR-MM)", example = "2026-11")
		String month,
		@Schema(description = "Przychody minus wydatki (PLN) ze wszystkich transakcji z datą do dziś włącznie")
		BigDecimal availableFunds,
		@Schema(description = "Zmiana dostępnych środków względem salda na koniec poprzedniego miesiąca, w procentach "
				+ "z jednym miejscem po przecinku; null, gdy tamto saldo było zerowe lub ujemne")
		BigDecimal availableFundsChangePercent,
		@Schema(description = "Suma wydatków (PLN) z całego bieżącego miesiąca kalendarzowego")
		BigDecimal monthExpenses,
		@Schema(description = "Suma przychodów (PLN) z całego bieżącego miesiąca kalendarzowego")
		BigDecimal monthIncome,
		@Schema(description = "Suma limitów budżetowych na bieżący miesiąc; null, gdy nie ustawiono żadnego limitu")
		BigDecimal monthLimitTotal) {

}
