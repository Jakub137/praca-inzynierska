CREATE TABLE categories (
	id BIGSERIAL PRIMARY KEY,
	user_id UUID,
	name VARCHAR(60) NOT NULL,
	icon VARCHAR(50),
	type VARCHAR(10) NOT NULL,
	is_default BOOLEAN NOT NULL DEFAULT FALSE,
	CONSTRAINT fk_categories_user
		FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	CONSTRAINT chk_categories_type
		CHECK (type IN ('INCOME', 'EXPENSE')),
	-- System categories have no owner; user categories are never defaults.
	CONSTRAINT chk_categories_default_owner
		CHECK ((user_id IS NULL) = is_default)
);

CREATE TABLE transactions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL,
	category_id BIGINT NOT NULL,
	amount DECIMAL(12,2) NOT NULL,
	currency VARCHAR(3) NOT NULL,
	amount_pln DECIMAL(12,2) NOT NULL,
	exchange_rate DECIMAL(8,4) NOT NULL,
	transaction_date DATE NOT NULL,
	description VARCHAR(100),
	type VARCHAR(10) NOT NULL,
	is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT fk_transactions_user
		FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	-- NO ACTION is explicit: it is checked after the whole DELETE, so deleting a user
	-- can cascade to categories and transactions in any order.
	CONSTRAINT fk_transactions_category
		FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE NO ACTION,
	CONSTRAINT chk_transactions_type
		CHECK (type IN ('INCOME', 'EXPENSE')),
	CONSTRAINT chk_transactions_currency
		CHECK (currency IN ('PLN', 'EUR', 'USD', 'GBP', 'CHF')),
	CONSTRAINT chk_transactions_amounts_positive
		CHECK (amount > 0 AND amount_pln > 0 AND exchange_rate > 0)
);

CREATE INDEX idx_transactions_user_date ON transactions (user_id, transaction_date);
CREATE INDEX idx_transactions_user_category ON transactions (user_id, category_id);
