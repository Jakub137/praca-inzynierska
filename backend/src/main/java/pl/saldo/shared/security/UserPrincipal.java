package pl.saldo.shared.security;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import pl.saldo.user.domain.UserEntity;

public record UserPrincipal(UUID id, String email) implements UserDetails {

	public static UserPrincipal fromEntity(UserEntity user) {
		return new UserPrincipal(user.getId(), user.getEmail());
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return List.of();
	}

	// The principal carries no credentials: requests are authenticated by the JWT, passwords are checked at login only.
	@Override
	public String getPassword() {
		return null;
	}

	@Override
	public String getUsername() {
		return email;
	}

}

