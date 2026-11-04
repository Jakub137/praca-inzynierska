# praca-inżynierska

Saldo — Aplikacja do Zarządzania Budżetem Domowym z Modułem Analitycznym i Wsparciem AI

## 1. Opis Projektu

Aplikacja webowa **Saldo** to system zarządzania finansami osobistymi wspierający:

* Monitorowanie codziennych przychodów i wydatków w wielu walutach z automatycznym przeliczaniem wg kursów NBP.
* Inteligentną kategoryzację wydatków przy użyciu sztucznej inteligencji (LLM).
* Śledzenie i kontrolę limitów budżetowych z graficznymi wskaźnikami zużycia.
* Planowanie i realizację długoterminowych celów oszczędnościowych.
* Generowanie zestawień i raportów finansowych (CSV, PDF) oraz wykresów analitycznych.

Projekt łączy standardy architektoniczne nowoczesnego oprogramowania klasy Enterprise (Clean Architecture, wzorzec Action / Use Case, testy jednostkowe i integracyjne z Testcontainers) ze standardami dostępności cyfrowej **WCAG 2.1 na poziomie AA**.

---

## 2. Stos Technologiczny

* **Backend:** Java 21 (LTS), Spring Boot 3.3.x, Spring Security (JWT, BCrypt), Spring Data JPA / Hibernate, Flyway.
* **Baza Danych:** PostgreSQL 16 (konteneryzacja Docker), integracja kursów walut NBP (Tabela A).
* **Frontend:** Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS.
* **Testowanie i Jakość:** JUnit 5, Mockito, Testcontainers, ESLint, Prettier.
* **DevOps & CI/CD:** Docker Compose, GitHub Actions, Nginx Reverse Proxy, Let's Encrypt SSL.

---

## 3. Wymagania Wstępne i Uruchomienie Środowiska

### Wymagania

* Git >= 2.40
* Java OpenJDK 21 LTS
* Node.js >= 20.x LTS & npm
* Docker & Docker Compose v2

### Uruchomienie środowiska bazodanowego (PostgreSQL 16)

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

Plik `.env` zawiera lokalne dane logowania do bazy i nie jest śledzony przez Git.
Baza nasłuchuje na `127.0.0.1:5432` (baza `saldo`, użytkownik `saldo`), a dane są przechowywane w wolumenie Dockera `saldo_postgres_data`.
