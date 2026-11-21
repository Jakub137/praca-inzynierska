package pl.saldo.goal.usecase;

import java.math.BigDecimal;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record DepositToGoalCommand(
		@NotNull(message = "Kwota wpłaty jest wymagana")
		@Positive(message = "Kwota wpłaty musi być większa od zera")
		@Digits(integer = 10, fraction = 2,
				message = "Kwota wpłaty może mieć maksymalnie 10 cyfr przed przecinkiem i 2 po przecinku")
		BigDecimal amount) {

}
