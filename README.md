# Plugin Monitor

Centralny system monitoringu wtyczek platnosci e-commerce. Zbiera dane z pluginow WooCommerce, Magento, Sylius i PrestaShop, monitoruje domeny w rejestrze hazardowym Ministerstwa Finansow, loguje statystyki paywall i bledy wtyczek.

## Architektura

```
                        ┌─────────────────────────────┐
                        │       Plugin Monitor        │
                        │                             │
  Wtyczki               │  ┌─────────┐  ┌─────────┐  │
  (WooCommerce,         │  │ Fastify │  │ React   │  │
   Magento, Sylius,  ──►│  │ Backend │  │ Frontend│  │
   PrestaShop)          │  │ :3001   │  │ :3000   │  │
                        │  └────┬────┘  └─────────┘  │
                        │       │                     │
  MF Rejestr            │  ┌────▼────┐  ┌─────────┐  │
  Hazardowy          ──►│  │ BullMQ  │  │Postgres │  │
  (PULL co 2h +         │  │ Worker  │  │  :5432  │  │
   PUSH endpoint)       │  └────┬────┘  └─────────┘  │
                        │       │       ┌─────────┐  │
                        │       └──────►│  Redis   │  │
                        │               │  :6379   │  │
                        └───────────────┴─────────┴──┘
```

## Stos technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Backend | Node.js, Fastify, TypeScript |
| ORM | Drizzle ORM |
| Kolejka | BullMQ + Redis |
| Baza | PostgreSQL 16 |
| Frontend | React 18, Mantine v7, TanStack Query, Recharts |
| XML parser | fast-xml-parser |
| Deploy | Docker Compose |

## Szybki start

### Wymagania
- Docker + Docker Compose
- Node.js 20+

### Uruchomienie

```bash
# 1. Klonuj repo
cd plugin-monitor

# 2. Uruchom baze i redis
docker compose up -d postgres redis

# 3. Zainstaluj zaleznosci backendu
cd backend && npm install

# 4. Stworz tabele w bazie
npx drizzle-kit push

# 5. Seed admin user
npx tsx src/db/seed.ts
# => admin@pluginmonitor.pl / admin123

# 6. Uruchom backend
npm run dev

# 7. Uruchom worker (w osobnym terminalu)
npx tsx src/worker.ts

# 8. Zainstaluj i uruchom frontend (w osobnym terminalu)
cd ../frontend && npm install && npm run dev
```

Dashboard dostepny na **http://localhost:3000**

### Docker (produkcja)

```bash
docker compose up -d
```

Serwisy:
- `postgres` — baza danych (:5432)
- `redis` — kolejka/cache (:6379)
- `backend` — API Fastify (:3001)
- `worker` — BullMQ workers (osobny kontener)
- `frontend` — React + nginx (:3000)

## Zmienne srodowiskowe

Skopiuj `.env.example` do `.env` i uzupelnij:

| Zmienna | Domyslna | Opis |
|---------|----------|------|
| `DB_PASSWORD` | `pm_secret_2024` | Haslo do PostgreSQL |
| `JWT_SECRET` | `change_me_in_production` | Secret do JWT tokenow |
| `SMTP_HOST` | — | Host serwera SMTP |
| `SMTP_PORT` | `587` | Port SMTP |
| `SMTP_USER` | — | Login SMTP |
| `SMTP_PASS` | — | Haslo SMTP |

## Baza danych

### Tabele

| Tabela | Opis |
|--------|------|
| `shops` | Sklepy (nazwa, domena, platforma, API key) |
| `users` | Uzytkownicy dashboardu (email, haslo, rola) |
| `user_notification_prefs` | Preferencje notyfikacji (sekcja, sklep, email) |
| `hazard_domains` | Lokalna kopia rejestru domen hazardowych MF |
| `hazard_alerts` | Alerty gdy domena sklepu pojawi sie w rejestrze |
| `hazard_sync_log` | Historia synchronizacji z rejestrem MF |
| `paywall_events` | Zdarzenia platnosci (transakcje, refundy) |
| `plugin_events` | Bledy, ostrzezenia, info z wtyczek |

### Migracje

```bash
cd backend

# Generuj migracje po zmianie schema.ts
npx drizzle-kit generate

# Zastosuj migracje
npx drizzle-kit migrate

# Lub push bezposredni (dev)
npx drizzle-kit push
```

## API

### Autentykacja

**Dashboard** — JWT w httpOnly cookie. Login zwraca token + refresh token.

**Wtyczki** — API Key w headerze `X-API-Key`. Klucz generowany w dashboardzie przy tworzeniu sklepu.

### Endpointy

#### Health
```
GET /api/health
```

#### Auth
```
POST /api/auth/login        { email, password }
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/refresh
```

#### Ingest (wtyczki -> system)
```
POST /api/ingest/batch       # Glowny endpoint
POST /api/ingest/register    # Rejestracja przy aktywacji pluginu
```
Autentykacja: `X-API-Key` header

#### Hazard
```
POST /api/hazard/push                    # MF push endpoint (XML)
GET  /api/dashboard/hazard/status        # Status synchronizacji
GET  /api/dashboard/hazard/domains       # Lista domen (paginacja + search)
GET  /api/dashboard/hazard/alerts        # Alerty dopasowanych domen
POST /api/dashboard/hazard/check         # Reczny trigger synchronizacji
GET  /api/dashboard/hazard/sync-log      # Historia sync
```

#### Paywall
```
GET /api/dashboard/paywall/events        # Lista zdarzen (filtrowane)
GET /api/dashboard/paywall/stats         # Statystyki per typ
```

#### Errors
```
GET   /api/dashboard/errors/events       # Lista bledow (filtrowane)
PATCH /api/dashboard/errors/events/:id/read  # Oznacz jako przeczytane
GET   /api/dashboard/errors/stats        # Zliczenia per severity
```

#### Shops
```
GET    /api/dashboard/shops              # Lista sklepow
GET    /api/dashboard/shops/:id          # Szczegoly sklepu
POST   /api/dashboard/shops              # Dodaj sklep
PUT    /api/dashboard/shops/:id          # Edytuj sklep
POST   /api/dashboard/shops/:id/regenerate-key  # Nowy API key
```

Pelna specyfikacja integracji dostepna w dashboardzie w zakladce **Integracja**.

## Modul hazardowy

System integruje sie z Rejestrem Domen Sluzacych do Oferowania Gier Hazardowych Niezgodnie z Ustawa prowadzonym przez Ministerstwo Finansow.

### PULL (co 2 godziny)
1. Sprawdza `GET /api/Register/ModificationDate`
2. Jesli zmiana — pobiera pelny rejestr `GET /api/Register` (~55k domen XML)
3. Parsuje XML, upsert do `hazard_domains`
4. Porownuje domeny sklepow z rejestrem
5. Tworzy alerty jesli domena sklepu jest w rejestrze

### PUSH (endpoint dla MF)
- `POST /api/hazard/push` — przyjmuje XML z dodanymi/wykreslonymi domenami
- Zwraca header `Rsh-Push: accepted` + status 200
- Zgodne ze specyfikacja MF v1.2

## Modul Monitor we wtyczce WooCommerce

Wtyczka WooCommerce (`planet-pay-payment`) zawiera modul `src/Monitor/` ktory:

1. **Buforuje** eventy w `wp_transient` (ring buffer, max 50 eventow)
2. **Flushuje** asynchronicznie (`wp_remote_post`, `blocking: false`, timeout 2s)
3. **Nie wymaga crona** — wpina sie w naturalne hooki platnosci

### Triggery flush
| Hook | Kiedy |
|------|-------|
| `planetpay_payment_notification_processed` | Kazdy webhook platnosci |
| `planetpay_refund_notification_processed` | Kazdy webhook refundu |
| `planetpay_payment_initiated` | Klient klika "Zaplac" |
| `planetpay_refund_initiated` | Refund zlecony |
| `planetpay_api_error` | Blad API PlanetPay |
| `admin_init` | Admin otwiera panel (throttle 5 min) |

### Konfiguracja w WooCommerce
W ustawieniach wtyczki PlanetPay > sekcja "Plugin Monitor":
- **Enable Monitor** — wlacz/wylacz wysylanie danych
- **Monitor URL** — adres instancji Plugin Monitor
- **Monitor API Key** — klucz API wygenerowany w dashboardzie

## Rozwoj

```bash
# Backend dev (hot reload)
cd backend && npm run dev

# Worker
cd backend && npx tsx src/worker.ts

# Frontend dev
cd frontend && npm run dev

# Build
cd backend && npm run build
cd frontend && npm run build
```

## Licencja

Wlasnosc prywatna. Wszystkie prawa zastrzezone.
