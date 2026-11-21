package pl.saldo.recurring.domain;

// The values must match chk_recurring_payments_frequency in V3_2: a new period needs a new migration.
public enum PaymentFrequency {
	WEEKLY,
	MONTHLY,
	YEARLY
}
