package pl.saldo.shared.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import pl.saldo.user.domain.UserEntity;

@Service
public class JwtService {

	static final String CLAIM_USER_ID = "userId";
	static final String CLAIM_EMAIL = "email";

	private final SecretKey signingKey;
	private final Duration expiration;
	private final Clock clock;
	private final JwtParser parser;

	public JwtService(JwtProperties properties, Clock clock) {
		this.signingKey = Keys.hmacShaKeyFor(properties.decodeSecret());
		this.expiration = properties.expiration();
		this.clock = clock;
		this.parser = Jwts.parser()
				.verifyWith(signingKey)
				.clock(() -> Date.from(clock.instant()))
				.build();
	}

	public String generateToken(UserEntity user) {
		Instant now = clock.instant();
		return Jwts.builder()
				.claim(CLAIM_USER_ID, user.getId().toString())
				.claim(CLAIM_EMAIL, user.getEmail())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plus(expiration)))
				// Explicit HS256: signWith(key) alone would pick HS384 for a 48-byte key.
				.signWith(signingKey, Jwts.SIG.HS256)
				.compact();
	}

	public long expiresInSeconds() {
		return expiration.toSeconds();
	}

	public UUID extractUserId(String token) {
		return UUID.fromString(parseClaims(token).get(CLAIM_USER_ID, String.class));
	}

	public boolean isTokenValid(String token, UserDetails userDetails) {
		try {
			String email = parseClaims(token).get(CLAIM_EMAIL, String.class);
			return userDetails.getUsername().equalsIgnoreCase(email);
		} catch (JwtException | IllegalArgumentException e) {
			return false;
		}
	}

	private Claims parseClaims(String token) {
		return parser.parseSignedClaims(token).getPayload();
	}

}
