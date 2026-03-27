# LagunApp Backend

NestJS microservices monorepo managed by Nx.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** NestJS 11
- **Monorepo:** Nx 22
- **Language:** TypeScript 5.9
- **Databases:** PostgreSQL 16, MongoDB 7
- **Cache:** Redis 7
- **Queue:** RabbitMQ 3 (via Bull)
- **Auth:** Passport + JWT, Google OAuth, Firebase Auth
- **Payments:** Stripe
- **Docs:** Swagger (OpenAPI)

## Project Structure

```
lagunapp-backend/
├── apps/api-gateway/        # API Gateway (main entry point)
├── admin-service/           # Admin management
├── ai-chatbot-service/      # AI chatbot
├── analytics-service/       # Analytics & tracking
├── auth-service/            # Authentication (not to confuse with auth/ library)
├── blog-service/            # Blog content
├── chat-service/            # Real-time chat
├── coupons-service/         # Coupons & discounts
├── events-service/          # Events management
├── notifications-service/   # Push/email notifications
├── restaurants-service/     # Restaurant management
├── reviews-service/         # User reviews
├── tickets-service/         # Ticketing & bookings
├── tours-service/           # Tours management
├── wallet-service/          # Wallet & payments
├── auth/                    # Shared auth library
├── common/                  # Shared common library
├── database/                # Shared database library
├── messaging/               # Shared messaging library
└── *-e2e/                   # E2E test projects
```

## Prerequisites

- Node.js >= 20
- Docker & Docker Compose (for infrastructure)
- Nx CLI: `npm install -g nx`

## Environment Variables

Copy the appropriate .env file for your build:

```bash
# For development/debug
cp .env.debug .env

# For production/release
cp .env.release .env
```

Then fill in the placeholder values (Firebase, Stripe, Google OAuth keys).

See `.env.example` for all required variables with descriptions.

## Running Infrastructure

Start the required databases and services:

```bash
cd ../lagunapp-infra
docker compose -f docker-compose.dev.yml up -d
```

This starts: PostgreSQL, MongoDB, Redis, RabbitMQ.

## Install Dependencies

```bash
npm install
```

## Running Services

```bash
# Run the API Gateway (main entry)
npx nx serve api-gateway

# Run a specific microservice
npx nx serve events-service
npx nx serve auth-service
npx nx serve restaurants-service
# ... etc

# Run all services
npx nx run-many --target=serve --all
```

## Building

```bash
# Build a specific service
npx nx build api-gateway
npx nx build events-service

# Build all services
npx nx run-many --target=build --all

# Production build
npx nx build api-gateway --configuration=production
```

## Testing

```bash
# Run tests for a specific service
npx nx test events-service

# Run all tests
npx nx run-many --target=test --all

# Run E2E tests
npx nx e2e events-service-e2e
```

## Linting

```bash
npx nx lint events-service
npx nx run-many --target=lint --all
```

## Code Conventions

- Single quotes (Prettier)
- NestJS module pattern for all services
- Shared libraries via `@lagunapp-backend/*` path aliases
- Each service follows: `src/app/app.module.ts`, `app.controller.ts`, `app.service.ts`
