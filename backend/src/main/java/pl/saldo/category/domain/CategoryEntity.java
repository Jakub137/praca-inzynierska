package pl.saldo.category.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import pl.saldo.transaction.domain.TransactionType;

@Entity
@Table(name = "categories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CategoryEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", nullable = false, updatable = false)
	private Long id;

	@Column(name = "user_id", updatable = false)
	private UUID userId;

	@Column(name = "name", nullable = false, length = 60)
	private String name;

	@Column(name = "icon", length = 50)
	private String icon;

	@Enumerated(EnumType.STRING)
	@Column(name = "type", nullable = false, length = 10)
	private TransactionType type;

	@Column(name = "is_default", nullable = false, updatable = false)
	private boolean isDefault;

	// Creates a user-owned category; system categories come only from the V2.1 seed migration.
	public CategoryEntity(UUID userId, String name, String icon, TransactionType type) {
		this.userId = userId;
		this.name = name;
		this.icon = icon;
		this.type = type;
		this.isDefault = false;
	}

}
