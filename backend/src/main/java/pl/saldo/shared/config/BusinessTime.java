package pl.saldo.shared.config;

import java.time.ZoneId;

public final class BusinessTime {

	// The Clock bean stays in UTC; calendar decisions (which month is "current") use the user's business zone.
	public static final ZoneId ZONE = ZoneId.of("Europe/Warsaw");

	private BusinessTime() {
	}

}
