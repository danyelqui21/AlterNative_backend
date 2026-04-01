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
- **Storage:** Firebase Storage (image uploads, WebP optimization via Sharp)
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

Then fill in the placeholder values (Firebase, Stripe, Google OAuth keys). See below for Firebase setup.

See `.env.example` for all required variables with descriptions.

## Firebase Setup

Firebase is used for **push notifications** (FCM) and **image storage** (Firebase Storage). Both features degrade gracefully if not configured — the app still runs, just without push/uploads.

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → name it (e.g., `lagunapp` or `goo-lagun`)
3. Disable Google Analytics (optional, not needed)
4. Click **Create project**

### 2. Generate a Service Account Key

1. In Firebase Console → **Project Settings** (gear icon) → **Service accounts**
2. Click **Generate new private key** → download the JSON file
3. From the JSON file, extract these 3 values:

```
FIREBASE_PROJECT_ID    → "project_id" field
FIREBASE_CLIENT_EMAIL  → "client_email" field  
FIREBASE_PRIVATE_KEY   → "private_key" field (the full -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY----- string)
```

4. Paste them into your `.env`:

```bash
FIREBASE_PROJECT_ID=lagunapp-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@lagunapp-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBAD...\n-----END PRIVATE KEY-----\n"
```

**Important:** Wrap the private key in double quotes and keep the `\n` escape sequences.

### 3. Enable Firebase Storage

1. In Firebase Console → **Build** → **Storage**
2. Click **Get started** → choose **Start in production mode**
3. Select a Cloud Storage location (e.g., `us-central1` or closest to your users)
4. Once created, your bucket name appears at the top (e.g., `lagunapp-12345.firebasestorage.app`)
5. Add to `.env`:

```bash
FIREBASE_STORAGE_BUCKET=lagunapp-12345.firebasestorage.app
```

### 4. Set Storage Security Rules

In Firebase Console → **Storage** → **Rules**, replace with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Public read access (images are served via public URLs with tokens)
    match /{allPaths=**} {
      allow read: if true;
      // Only the backend (via Admin SDK) can write — no client-side uploads
      allow write: if false;
    }
  }
}
```

The backend uses the **Admin SDK** which bypasses security rules, so `allow write: if false` is correct — it blocks direct client uploads while the Admin SDK still works.

### 5. (Optional) Enable Firebase Cloud Messaging

For push notifications:
1. In Firebase Console → **Project Settings** → **Cloud Messaging**
2. Ensure the Cloud Messaging API (V1) is enabled
3. No additional env vars needed — FCM uses the same service account

### Summary of Firebase `.env` Variables

```bash
# Firebase Admin SDK (required for push + storage)
FIREBASE_PROJECT_ID=lagunapp-12345
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@lagunapp-12345.iam.gserviceaccount.com

# Firebase Storage bucket (required for image uploads)
FIREBASE_STORAGE_BUCKET=lagunapp-12345.firebasestorage.app
```

### Image Upload Flow

```
Client sends file → POST /api/uploads/image?folder=events
  → Backend validates (type, size ≤ 10MB)
  → Sharp compresses + converts to WebP (quality 80, max 1920px)
  → Uploads to Firebase Storage with CDN cache headers (1 year, immutable)
  → Returns { url, path, size, contentType }
  → Client saves the URL to the entity's imageUrl field
```

Supported folders: `events`, `theaters`, `restaurants`, `tours`, `users`, `artists`, `blog`, `clans`, `general`.

## Running Infrastructure

Start the required databases and services:

```bash
cd infra
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

## Theaters Module

Theater/cinema management system (think Cinepolis/Cinemex). Supports numbered seating (users pick specific chairs) and general admission (ticket count only).

### Roles

- `theater_manager` — full theater CRUD, layout editor, event creation
- `theater_submanager` — same as manager but scoped to their assigned theater

### Database Schema (PostgreSQL)

| Table | Purpose |
|-------|---------|
| `theaters` | Venue entity (name, address, city, managerId, capacity) |
| `seating_layouts` | Layout templates per theater (canvasWidth/Height, backgroundUrl) |
| `seats` | Individual chairs: posX, posY, angle, color, seatType, label, section, row |
| `theater_events` | Links event → theater + layout + `seatingMode` ('numbered' \| 'general') |
| `seat_reservations` | Confirmed purchases (UNIQUE on theaterEventId + seatId) |

### Seat Reservation — 5-Step Overbooking Prevention

Uses **Redis TTL** for temporary holds + **PostgreSQL UNIQUE** as final safety net:

| Step | When | What | Service Method |
|------|------|------|----------------|
| 1 | Real-time | WebSocket broadcasts seat status to all viewers | `SeatsGateway.broadcastSeatUpdate()` |
| 2 | On tap | Check seat availability before UI selection | `SeatReservationService.isSeatAvailable()` |
| 3 | On hold | Atomic `SET NX` with 600s TTL (all-or-nothing) | `SeatReservationService.holdSeats()` |
| 4 | On payment | Re-verify holds belong to user | `TheatersGatewayService.verifySeatHoldsForPayment()` |
| 5 | On webhook | Final DB write + Redis cleanup, deny if occupied | `TheatersGatewayService.confirmSeatsAfterPayment()` |

If Redis is down, graceful fallback to DB UNIQUE constraint (same pattern as `TokenBlacklistService`).

### Key Files

| File | Role |
|------|------|
| `apps/api-gateway/src/app/entities/theater.entity.ts` | Theater entity |
| `apps/api-gateway/src/app/entities/seating-layout.entity.ts` | Layout entity |
| `apps/api-gateway/src/app/entities/seat.entity.ts` | Seat entity |
| `apps/api-gateway/src/app/entities/theater-event.entity.ts` | Theater-Event link + SeatingMode enum |
| `apps/api-gateway/src/app/entities/seat-reservation.entity.ts` | Confirmed reservations |
| `apps/api-gateway/src/app/services/seat-reservation.service.ts` | Redis-based hold/verify/confirm |
| `apps/api-gateway/src/app/services/theaters-gateway.service.ts` | Theater CRUD + seat map + overbooking checks |
| `apps/api-gateway/src/app/gateways/seats.gateway.ts` | WebSocket for real-time seat updates |
| `apps/api-gateway/src/app/controllers/theaters.controller.ts` | Public API (browse, hold, release, verify) |
| `apps/api-gateway/src/app/controllers/admin-theaters.controller.ts` | Admin API (CRUD, layouts, seats, events) |

### API Endpoints

**Public:**
- `GET /api/theaters` — List theaters
- `GET /api/theaters/:id` — Theater detail with layouts
- `GET /api/theaters/events/:eventId/seats` — Seat map with live availability
- `POST /api/theaters/events/:eventId/hold-seats` — Hold seats (10 min TTL)
- `POST /api/theaters/events/:eventId/release-seats` — Release held seats
- `POST /api/theaters/events/:eventId/verify-seats` — Pre-payment verification

**Admin:**
- `POST/PUT /api/admin/theaters` — Theater CRUD
- `POST/PUT /api/admin/theaters/:id/layouts` — Layout CRUD
- `PUT /api/admin/theaters/:id/layouts/:layoutId/seats` — Bulk upsert seats
- `POST /api/admin/theaters/events` — Link event to theater + seating mode

### WebSocket (Socket.io)

Namespace: `/seats`
- Client emits `join-event` with `{ theaterEventId }` to subscribe
- Server emits `seat-update` with `{ seatIds, status: 'held'|'released'|'reserved' }`
- Server emits `seat-bulk-status` for initial load

## Data Rules

- **NEVER hard-delete records.** Use `isActive = false` or `status = 'cancelled'`. The only exception is the seed script.
- **PostgreSQL** for relational data (users, events, tickets, clans, payments, artist core).
- **MongoDB** for flexible/high-write data (artist profiles, social links, reviews, comments, chat messages).
- **API Gateway** merges data from both databases before returning to clients.
- **RabbitMQ** for async event-driven sync between PostgreSQL and MongoDB. See `messaging/src/lib/messaging.service.ts` for full documentation. Key events: `artist.disabled`, `event.cancelled`, `review.created`. Services publish via `messaging.publish()` and subscribe via `messaging.subscribe()`. Gracefully degrades to local dispatch if RabbitMQ is unavailable.
- **Feature flags** in `platform_config` table control which modules are visible (`module.events`, `module.restaurants`, etc.).

## Validation Rules

- **ALL validation happens here on the backend.** Frontends and mobile apps do NOT validate business rules.
- Dates, quantities, prices, availability, permissions — all checked server-side in UseCases or Repositories.
- Frontends may show UI hints (e.g., "min 6 characters") but enforcement is always here.
- DTOs validate request shape (class-validator), UseCases validate business logic.

## Code Conventions

- Single quotes (Prettier)
- NestJS module pattern for all services
- Shared libraries via `@lagunapp-backend/*` path aliases
- Each service follows clean architecture:

```
├── entities/           # TypeORM entities
├── dto/                # Request validation
├── datasources/        # Abstract data access contracts
├── repositories/       # Abstract + implementation (business rules)
├── usecases/           # Single-responsibility business operations
├── app.controller.ts   # HTTP layer
├── app.service.ts      # Legacy (being migrated to usecases)
└── app.module.ts       # DI wiring
```
