# LagunApp Backend

Backend microservices for the **LagunApp** platform — a Mexican entertainment & hospitality app.

Built with **NestJS** and managed as an **Nx monorepo**.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| Monorepo | Nx 22 |
| Language | TypeScript 5.9 |
| Databases | PostgreSQL 16, MongoDB 7 |
| Cache | Redis 7 |
| Queue | RabbitMQ 3 (via Bull) |
| Auth | Passport + JWT, Google OAuth, Firebase Auth |
| Payments | Stripe |
| Docs | Swagger (OpenAPI) |

## Architecture

```
lagunapp-backend/
├── apps/
│   └── api-gateway/             # API Gateway (main entry point)
├── admin-service/               # Admin management
├── ai-chatbot-service/          # AI chatbot
├── analytics-service/           # Analytics & tracking
├── auth-service/                # Authentication service
├── blog-service/                # Blog content
├── chat-service/                # Real-time chat
├── clans-service/               # ClanCity — clans, chat, event sharing
├── coupons-service/             # Coupons & discounts
├── events-service/              # Events management
├── notifications-service/       # Push/email notifications
├── restaurants-service/         # Restaurant management
├── reviews-service/             # User reviews
├── tickets-service/             # Ticketing & bookings
├── tours-service/               # Tours management
├── wallet-service/              # Wallet & payments
├── scripts/                     # Seed script and utilities
├── auth/                        # Shared auth library
├── common/                      # Shared common library
├── database/                    # Shared database library
└── messaging/                   # Shared messaging library
```

Shared libraries are imported via path aliases: `@lagunapp-backend/common`, `@lagunapp-backend/database`, `@lagunapp-backend/auth`, `@lagunapp-backend/messaging`.

## What is Nx and Why We Use It

**Nx** is a monorepo build system. Think of it as a smart task runner that knows the relationships between all 15+ services in this repo.

### The Problem It Solves

Without Nx, you'd have 15 separate `package.json` scripts, 15 separate build commands, and no way to know which services depend on which. If you change the `auth` library, you'd have to manually remember that `auth-service`, `events-service`, `clans-service`, and `api-gateway` all need to be rebuilt.

### How It Works for Us

Every service and library has a `project.json` that tells Nx what it can do (build, serve, test, lint). Nx automatically detects dependencies by reading the TypeScript imports.

```
You run:  npx nx serve api-gateway

Nx sees:  api-gateway imports from → auth-service, events-service, clans-service
          auth-service imports from → auth (library), database (library)

Nx does:  1. Build auth + database libraries
          2. Build auth-service, events-service, clans-service (in parallel)
          3. Build api-gateway
          4. Start api-gateway with hot reload
```

**Key Nx commands:**

| Command | What it does |
|---------|-------------|
| `npx nx serve api-gateway` | Build dependencies + start with hot reload |
| `npx nx build api-gateway` | Build the gateway and all its dependencies |
| `npx nx test events-service` | Run tests for events-service |
| `npx nx run-many --target=build --all` | Build everything |
| `npx nx run-many --target=lint --all` | Lint everything |
| `npx nx graph` | Open a visual dependency graph in your browser |

**Caching:** Nx caches build results. If you rebuild and nothing changed in `auth-service`, it skips it instantly — you'll see `[local cache]` in the output. This makes rebuilds much faster.

**Shared libraries** (`auth/`, `common/`, `database/`, `messaging/`) are imported via path aliases like `@lagunapp-backend/auth`. These are configured in `tsconfig.base.json` and shared across all services.

## Prerequisites

- **Node.js** >= 20
- **Docker & Docker Compose** (for PostgreSQL, MongoDB, Redis, RabbitMQ)
- **Nx CLI** (optional): `npm install -g nx`

## Getting Started

### 1. Start the Databases

The backend needs 4 infrastructure services running. They're managed via Docker Compose in the `lagunapp-infra` repo.

```bash
cd lagunapp-infra
docker compose -f docker-compose.dev.yml up -d
```

This starts:

| Service | Port | Purpose | Management UI |
|---------|------|---------|---------------|
| **PostgreSQL 16** | `5432` | Main relational database (users, events, clans, tickets) | — |
| **MongoDB 7** | `27017` | Document database (chat messages, analytics, logs) | — |
| **Redis 7** | `6379` | Cache, sessions, rate limiting | — |
| **RabbitMQ 3** | `5672` | Message queue between microservices | http://localhost:15672 |

**Default credentials** (development only):
- **User:** `lagunapp`
- **Password:** `lagunapp_dev_2026`
- **PostgreSQL database:** `lagunapp_db`

**Check status:**
```bash
docker compose -f docker-compose.dev.yml ps
```

**View logs:**
```bash
docker compose -f docker-compose.dev.yml logs -f postgres
```

**Stop services:**
```bash
docker compose -f docker-compose.dev.yml down       # Stop (data preserved)
docker compose -f docker-compose.dev.yml down -v     # Stop AND delete all data
```

> **Important:** Data is persisted in Docker volumes. Stopping and restarting containers (`down` then `up`) keeps your data. Only `down -v` wipes it.

> **Port conflicts:** If you have a local PostgreSQL or MongoDB installed (via Homebrew, etc.), they'll conflict with Docker on the same ports. Stop them first:
> ```bash
> brew services stop postgresql@14   # or whatever version
> brew services stop mongodb-community
> ```

### 2. Configure Environment

```bash
cp .env.debug .env
```

Edit `.env` and fill in your Firebase, Stripe, and Google OAuth credentials. See `.env.example` for all required variables.

| File | Purpose |
|------|---------|
| `.env.debug` | Development values (localhost, test keys) |
| `.env.release` | Production values (env var references for CI/CD) |
| `.env.example` | Template with placeholders |

### 3. Install Dependencies

```bash
npm install
```

### 4. Seed the Database

```bash
npm run seed
```

Seeds the PostgreSQL database with:
- **11 users** — 1 admin, 4 regular users, 2 organizers, 2 restaurant owners, 2 scanner staff
- **8 events** — Across categories (conciertos, festivales, deportes, etc.) with ticket types (General, VIP, Early Bird)
- **ClanCity config** — `enableEveryNUsers=100`, `maxClansPerUser=2`, `maxMembersPerClan=10`

All seed users share the password **`LagunApp2026!`**. See `seed-users.txt` at the monorepo root for the full credentials list.

Requires PostgreSQL running (step 1). Re-running clears and re-seeds all data.

### 5. Start the Backend

```bash
# Start the API Gateway (recommended — this is the main entry point)
npx nx serve api-gateway
```

The API Gateway starts at **http://localhost:3000/api**.

Nx will automatically build all dependencies (auth-service, events-service, clans-service) before starting. First run takes ~30 seconds; subsequent runs use cache and take ~5 seconds.

**Other run options:**
```bash
# Start a specific microservice standalone
npx nx serve events-service

# Start all services at once
npx nx run-many --target=serve --all
```

### 6. Verify It Works

```bash
# Health check
curl http://localhost:3000/api/health

# Get all events
curl http://localhost:3000/api/events

# Login as a seed user
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"carlos.mendoza@correo.mx","password":"LagunApp2026!"}'
```

## Building

```bash
# Build a single service
npx nx build api-gateway

# Production build
npx nx build api-gateway --configuration=production

# Build everything
npx nx run-many --target=build --all
```

## Testing

```bash
# Test a specific service
npx nx test events-service

# Run all tests
npx nx run-many --target=test --all

# E2E tests
npx nx e2e events-service-e2e
```

## Linting

```bash
npx nx lint events-service
npx nx run-many --target=lint --all
```

## Environment Variables Reference

| Variable | Description | Default (debug) |
|----------|-------------|-----------------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API Gateway port | `3000` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_USER` | PostgreSQL user | `lagunapp` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `lagunapp_dev_2026` |
| `POSTGRES_DB` | PostgreSQL database | `lagunapp_db` |
| `MONGO_URI` | MongoDB connection string | `mongodb://lagunapp:...@localhost:27017` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | `lagunapp_dev_2026` |
| `RABBITMQ_URL` | RabbitMQ connection | `amqp://lagunapp:...@localhost:5672` |
| `JWT_SECRET` | JWT signing secret | *(change me)* |
| `FIREBASE_PROJECT_ID` | Firebase project | *(your value)* |
| `STRIPE_SECRET_KEY` | Stripe secret key | *(your value)* |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | *(your value)* |

## Code Conventions

- **Formatting:** Prettier with single quotes
- **Modules:** NestJS module pattern for all services
- **Shared code:** Via `@lagunapp-backend/*` path aliases
- **Service structure:** Clean architecture (see below)

## Architecture

Each microservice follows a **clean architecture** pattern with clearly separated layers:

```
service/src/app/
├── entities/           # TypeORM entities (database schema)
├── dto/                # Request validation (class-validator)
├── datasources/        # Abstract data access contracts
├── repositories/       # Abstract + implementation (business rules)
├── usecases/           # Single-responsibility business operations
├── app.controller.ts   # HTTP layer (routes, guards, pipes)
├── app.service.ts      # Legacy facade (being migrated to usecases)
└── app.module.ts       # DI wiring (providers, imports, exports)
```

### Data Flow

```
Controller  -->  UseCase  -->  Repository  -->  Datasource
(HTTP)          (business)     (rules)          (DB access)
```

1. **Controller** receives the HTTP request, validates input, and delegates to a UseCase.
2. **UseCase** contains a single business operation (e.g., `CreateEventUseCase`). It orchestrates one or more Repositories.
3. **Repository** enforces business rules and delegates raw data access to a Datasource.
4. **Datasource** is the only layer that talks to the database (TypeORM, MongoDB driver, etc.).

Dependencies point inward: outer layers depend on inner layers, never the reverse.

### API Documentation

- **Swagger (OpenAPI):** Available at [`/api/docs`](http://localhost:3000/api/docs) when the API Gateway is running.
- **Postman collection:** `postman/LagunApp.postman_collection.json` -- importable collection with all endpoints, example bodies, and environment variables.

## Related Repositories

- **lagunapp-admin** — Admin dashboard (React + Vite)
- **lagunapp_user** — User mobile app (Flutter)
- **lagunapp_organizer** — Organizer mobile app (Flutter)
- **lagunapp_restaurant** — Restaurant mobile app (Flutter)
- **lagunapp_scanner** — Scanner mobile app (Flutter)
- **lagunapp-infra** — Infrastructure (Docker Compose)

## License

Private — All rights reserved.
