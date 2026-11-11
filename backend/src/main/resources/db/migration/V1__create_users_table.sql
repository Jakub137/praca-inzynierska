CREATE TABLE users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	email VARCHAR(150) NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	first_name VARCHAR(60) NOT NULL,
	last_name VARCHAR(60) NOT NULL,
	default_currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT chk_users_default_currency
		CHECK (default_currency IN ('PLN', 'EUR', 'USD', 'GBP', 'CHF'))
);

-- Spring Data generates UPPER(email) for findByEmailIgnoreCase / existsByEmailIgnoreCase.
CREATE UNIQUE INDEX idx_users_email_upper ON users (upper(email));

