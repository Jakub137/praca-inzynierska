package pl.saldo.shared.security;

import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.HandlerExceptionResolver;

import jakarta.servlet.DispatcherType;
import pl.saldo.user.infrastructure.UserRepository;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
@EnableConfigurationProperties(CorsProperties.class)
public class SecurityConfiguration {

	private static final String[] PUBLIC_ENDPOINTS = {
			"/api/v1/auth/**",
			"/api/v1/health",
			"/swagger-ui.html",
			"/swagger-ui/**",
			"/v3/api-docs/**"
	};
	private static final String API_PATH_PATTERN = "/api/**";
	private static final List<String> CORS_METHODS = List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
	private static final List<String> CORS_HEADERS = List.of(
			HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE, HttpHeaders.ACCEPT);
	private static final Duration CORS_MAX_AGE = Duration.ofHours(1);

	@Bean
	RestSecurityExceptionHandler restSecurityExceptionHandler(
			@Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver) {
		return new RestSecurityExceptionHandler(exceptionResolver);
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, JwtService jwtService,
			UserRepository userRepository, RestSecurityExceptionHandler securityExceptionHandler)
			throws Exception {
		http
				.csrf((csrf) -> csrf.disable())
				.cors(Customizer.withDefaults())
				.sessionManagement((session) -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.formLogin((form) -> form.disable())
				.httpBasic((basic) -> basic.disable())
				.logout((logout) -> logout.disable())
				.exceptionHandling((exceptions) -> exceptions
						.authenticationEntryPoint(securityExceptionHandler)
						.accessDeniedHandler(securityExceptionHandler))
				.authorizeHttpRequests((authorize) -> authorize
						.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
						.requestMatchers(PUBLIC_ENDPOINTS).permitAll()
						.anyRequest().authenticated())
				.addFilterBefore(
						new JwtAuthenticationFilter(jwtService, userRepository, securityExceptionHandler),
						UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}

	@Bean
	UrlBasedCorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(List.of(properties.allowedOrigin()));
		configuration.setAllowedMethods(CORS_METHODS);
		configuration.setAllowedHeaders(CORS_HEADERS);
		configuration.setMaxAge(CORS_MAX_AGE);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration(API_PATH_PATTERN, configuration);
		return source;
	}

	@Bean
	UserDetailsService userDetailsService(UserRepository userRepository) {
		return email -> userRepository.findByEmailIgnoreCase(email)
				.map(UserPrincipal::fromEntity)
				.orElseThrow(() -> new UsernameNotFoundException("User not found"));
	}

}
