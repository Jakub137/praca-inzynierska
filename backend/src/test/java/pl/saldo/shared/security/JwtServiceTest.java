package pl.saldo.shared.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import pl.saldo.currency.domain.SupportedCurrency;
import pl.saldo.user.domain.UserEntity;

class JwtServiceTest {

	private static final Instant NOW = Instant.parse("2026-01-01T10:00:00Z");
	private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
	private static final Duration EXPIRATION = Duration.ofHours(24);
	private static final byte KEY_FILL = 7;
	private static final byte OTHER_KEY_FILL = 9;
	private static final int KEY_LENGTH_BYTES = 48;
	private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
	private static final String EMAIL = "jan.kowalski@example.com";

	private final JwtService jwtService = newService(KEY_FILL, CLOCK);
	private final UserEntity user = persistedUser();

	@Test
	void signsTokenWithHs256EvenForLongerKey() {
		Jws<Claims> jws = parse(jwtService.generateToken(user));

		assertThat(jws.getHeader().getAlgorithm()).isEqualTo("HS256");
	}

	@Test
	void putsUserClaimsAndTwentyFourHourExpiryInToken() {
		Claims claims = parse(jwtService.generateToken(user)).getPayload();

		assertThat(claims.get(JwtService.CLAIM_USER_ID, String.class)).isEqualTo(USER_ID.toString());
		assertThat(claims.get(JwtService.CLAIM_EMAIL, String.class)).isEqualTo(EMAIL);
		assertThat(claims.getIssuedAt()).isEqualTo(Date.from(NOW));
		assertThat(claims.getExpiration()).isEqualTo(Date.from(NOW.plus(Duration.ofHours(24))));
	}

	@Test
	void extractsUserIdFromToken() {
		String token = jwtService.generateToken(user);

		assertThat(jwtService.extractUserId(token)).isEqualTo(USER_ID);
	}

	@Test
	void acceptsTokenForMatchingUser() {
		String token = jwtService.generateToken(user);

		assertThat(jwtService.isTokenValid(token, userDetails(EMAIL))).isTrue();
	}

	@Test
	void acceptsTokenWhenEmailDiffersOnlyByCase() {
		String token = jwtService.generateToken(user);

		assertThat(jwtService.isTokenValid(token, userDetails("JAN.KOWALSKI@example.com"))).isTrue();
	}

	@Test
	void rejectsTokenForDifferentUser() {
		String token = jwtService.generateToken(user);

		assertThat(jwtService.isTokenValid(token, userDetails("anna.nowak@example.com"))).isFalse();
	}

	@Test
	void rejectsExpiredToken() {
		String token = jwtService.generateToken(user);
		JwtService laterService = newService(KEY_FILL, Clock.offset(CLOCK, EXPIRATION.plusSeconds(1)));

		assertThat(laterService.isTokenValid(token, userDetails(EMAIL))).isFalse();
	}

	@Test
	void rejectsTokenSignedWithDifferentKey() {
		String foreignToken = newService(OTHER_KEY_FILL, CLOCK).generateToken(user);

		assertThat(jwtService.isTokenValid(foreignToken, userDetails(EMAIL))).isFalse();
	}

	@Test
	void rejectsUnsignedToken() {
		String unsignedToken = Jwts.builder().claim(JwtService.CLAIM_EMAIL, EMAIL).compact();

		assertThat(jwtService.isTokenValid(unsignedToken, userDetails(EMAIL))).isFalse();
	}

	@Test
	void rejectsMalformedToken() {
		assertThat(jwtService.isTokenValid("not-a-jwt", userDetails(EMAIL))).isFalse();
	}

	@Test
	void extractUserIdThrowsForTokenSignedWithDifferentKey() {
		String foreignToken = newService(OTHER_KEY_FILL, CLOCK).generateToken(user);

		assertThatThrownBy(() -> jwtService.extractUserId(foreignToken)).isInstanceOf(JwtException.class);
	}

	private static JwtService newService(byte keyFill, Clock clock) {
		return new JwtService(new JwtProperties(encodedKey(keyFill), EXPIRATION), clock);
	}

	private static String encodedKey(byte keyFill) {
		byte[] key = new byte[KEY_LENGTH_BYTES];
		Arrays.fill(key, keyFill);
		return Base64.getEncoder().encodeToString(key);
	}

	private static Jws<Claims> parse(String token) {
		SecretKey key = Keys.hmacShaKeyFor(Base64.getDecoder().decode(encodedKey(KEY_FILL)));
		return Jwts.parser()
				.verifyWith(key)
				.clock(() -> Date.from(NOW))
				.build()
				.parseSignedClaims(token);
	}

	private static UserEntity persistedUser() {
		UserEntity entity = new UserEntity(EMAIL, "hash", "Jan", "Kowalski", SupportedCurrency.PLN, NOW);
		ReflectionTestUtils.setField(entity, "id", USER_ID);
		return entity;
	}

	private static UserDetails userDetails(String username) {
		return User.withUsername(username).password("irrelevant").authorities(List.of()).build();
	}

}
