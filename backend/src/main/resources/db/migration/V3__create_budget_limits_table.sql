CREATE TABLE budget_limits (
	id BIGSERIAL PRIMARY KEY,
	user_id UUID NOT NULL,
	category_id BIGINT NOT NULL,
	month INT NOT NULL,
	year INT NOT NULL,
	limit_amount DECIMAL(12,2) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT fk_budget_limits_user
		FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	-- Only budget limits are removed with the category: transactions still block
	-- deleting a category (fk_transactions_category has no CASCADE).
	CONSTRAINT fk_budget_limits_category
		FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
	CONSTRAINT chk_budget_limits_month
		CHECK (month BETWEEN 1 AND 12),
	CONSTRAINT chk_budget_limits_limit_amount_positive
		CHECK (limit_amount > 0),
	-- Column order lets the unique index also serve lookups by (user_id, year, month).
	CONSTRAINT uq_budget_limits_user_year_month_category
		UNIQUE (user_id, year, month, category_id)
);
