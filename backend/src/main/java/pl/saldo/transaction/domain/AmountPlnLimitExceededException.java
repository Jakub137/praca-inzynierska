package pl.saldo.transaction.domain;

public class AmountPlnLimitExceededException extends RuntimeException {

	public AmountPlnLimitExceededException() {
		super("Converted amount exceeds the amount_pln column limit");
	}

}
