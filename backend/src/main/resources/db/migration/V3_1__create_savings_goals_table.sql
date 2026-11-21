CREATE TABLE savings_goals (
	id BIGSERIAL PRIMARY KEY,
	user_id UUID NOT NULL,
	name VARCHAR(100) NOT NULL,
	target_amount DECIMAL(12,2) NOT NULL,
	current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
	target_date DATE NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT fk_savings_goals_user
		FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	CONSTRAINT chk_savings_goals_target_amount_positive
		CHECK (target_amount > 0),
	-- No upper bound by design: an overpayment is allowed and still counts as a completed goal.
	CONSTRAINT chk_savings_goals_current_amount_non_negative
		CHECK (current_amount >= 0)
);

-- The goal list is always read per user; there is no unique key whose prefix could serve it.
CREATE INDEX idx_savings_goals_user_id ON savings_goals (user_id);
