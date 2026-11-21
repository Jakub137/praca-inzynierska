CREATE TABLE recurring_payments (
	id BIGSERIAL PRIMARY KEY,
	user_id UUID NOT NULL,
	name VARCHAR(100) NOT NULL,
	amount DECIMAL(12,2) NOT NULL,
	currency VARCHAR(3) NOT NULL,
	frequency VARCHAR(20) NOT NULL,
	next_due_date DATE NOT NULL,
	category_id BIGINT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT fk_recurring_payments_user
		FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	-- Like budget limits (V3): recurring payments are removed with the category, while transactions
	-- still block deleting a category (fk_transactions_category has no CASCADE).
	CONSTRAINT fk_recurring_payments_category
		FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
	CONSTRAINT chk_recurring_payments_amount_positive
		CHECK (amount > 0),
	-- Same list as chk_transactions_currency in V2 and SupportedCurrency in the code.
	CONSTRAINT chk_recurring_payments_currency
		CHECK (currency IN ('PLN', 'EUR', 'USD', 'GBP', 'CHF')),
	-- Same values as PaymentFrequency in the code; a new period needs a new value, a new migration and a changed CHECK.
	CONSTRAINT chk_recurring_payments_frequency
		CHECK (frequency IN ('WEEKLY', 'MONTHLY', 'YEARLY'))
);

-- The list is always read per user and ordered by the next due date (also the base of the reminders query).
CREATE INDEX idx_recurring_payments_user_next_due_date ON recurring_payments (user_id, next_due_date);
