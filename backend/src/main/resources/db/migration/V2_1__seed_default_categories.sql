-- System categories: no owner (user_id IS NULL) and is_default = TRUE,
-- as enforced by chk_categories_default_owner in V2.
INSERT INTO categories (user_id, name, icon, type, is_default) VALUES
	(NULL, 'Artykuły spożywcze', 'shopping-cart', 'EXPENSE', TRUE),
	(NULL, 'Rozrywka', 'film', 'EXPENSE', TRUE),
	(NULL, 'Rachunki', 'receipt', 'EXPENSE', TRUE),
	(NULL, 'Transport', 'car', 'EXPENSE', TRUE),
	(NULL, 'Zdrowie', 'heart-pulse', 'EXPENSE', TRUE),
	(NULL, 'Restauracje', 'utensils', 'EXPENSE', TRUE),
	(NULL, 'Odzież', 'shirt', 'EXPENSE', TRUE),
	(NULL, 'Inne wydatki', 'ellipsis', 'EXPENSE', TRUE),
	(NULL, 'Wynagrodzenie', 'wallet', 'INCOME', TRUE),
	(NULL, 'Premia', 'gift', 'INCOME', TRUE),
	(NULL, 'Inne przychody', 'plus-circle', 'INCOME', TRUE);
