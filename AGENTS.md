# AGENTS.md — Lawyer Management System

## Monorepo overview

NestJS monorepo with 6 microservice apps + 2 shared libs, wired via RabbitMQ. All external traffic goes through the API Gateway.

### Apps (in `apps/`)

| App | Port | Queue | Role |
|-----|------|-------|------|
| `api-gateway` | 3010 | — | HTTP entrypoint, Swagger at `GET /api`, throttling (4 req/min) |
| `auth_service` | 3001 | `auth_queue` | JWT auth, user CRUD, cookie-parser |
| `booking_service` | 3002 | `booking_queue` | Appointment management |
| `notification_service` | 3003 | `notification_queue` | Email (Nodemailer) + SMS (Twilio) |
| `payment_service` | 3004 | `payment_queue` | Stripe payments |
| `provider_service` | 3005 | `provider_queue` | Provider profiles, reviews, search |

Planned (see `PLAN.md`): `ai_service`, `document_service`, `analytics_service`.

### Libs (in `libs/`)

- `@app/common` — auth guards, JWT strategy, roles/decorators, exception filters (`CatchExceptionsFilter`, `CatchGatewayExceptionsFilter`), pipes (`ValidateObjectIdPipe`), DTOs, RMQ event pattern constants
- `@app/rmq` — reusable `RmqService` with `getOptions(queue)` + `ack()` for RMQ connections

Path aliases configured in `tsconfig.json`:
- `@app/common` → `libs/common/src`
- `@app/rmq` → `libs/rmq/src`

## Key commands

```bash
npm run build            # nest build (webpack enabled)
npm run start:dev        # default app (auth_service)
npm run start:auth       # single service watch mode
npm run start:booking
npm run start:notification
npm run start:payment
npm run start:provider
npm run start:api-gateway
npm run start:dev:all    # concurrently runs all 6 services

npm run lint             # eslint + prettier —fix
npm run format           # prettier --write apps/**/*.ts libs/**/*.ts
npm run test             # jest (all *.spec.ts under apps/)
npm run test:cov
npm run test:e2e         # jest --config ./apps/booking_system/test/jest-e2e.json
```

Format: `prettier` with `singleQuote: true`, `trailingComma: "all"`.

## Architecture notes

- Each service boots both an HTTP server (health/liveness) and an RMQ microservice listener
- API Gateway does NOT connect to RMQ as a microservice — it uses `ClientProxy` (via `RmqModule.register({ name, queue })`) to send RMQ messages to each service
- All RMQ patterns are defined in `libs/common/src/constants/rmq-patterns.ts`
- Global `ValidationPipe({ whitelist: true, transform: true })` on most services
- All HTTP routes prefixed with `/api/v1`
- `strictNullChecks: false` in tsconfig
- `@nestjs/throttler` limits API Gateway to 4 requests/min per client (see `api-gateway.module.ts`)
- `.env` contains live secrets (MongoDB Atlas, CloudAMQP, Stripe, Twilio, Gmail app password) — do not commit
- `nest-cli.json` uses `webpack: true` — build output goes to `dist/`
- Tests live next to source files as `*.spec.ts`; jest root is `apps/`

## RMQ pattern conventions

Services listen for `@EventPattern` / `@MessagePattern` from their queue. The gateway uses `ClientProxy.send(pattern, data)` for request-response and `ClientProxy.emit(pattern, data)` for fire-and-forget events.

Key patterns (see `rmq-patterns.ts`):
- `user_created`, `appointment.booked`, `appointment.cancelled` → notification service events
- `provider.getList`, `provider.getById`, `provider.createMe`, `provider.createReview` → provider RPC
- `auth.getUser`, `auth.getUserPreferences` → auth RPC
- `booking.getAppointments`, `booking.markReminderSent` → booking RPC

## Future services (from PLAN.md)

New apps need: `nest generate app <name>`, add queue to `QUEUES` in `rmq-patterns.ts`, add `RmqModule.register(...)` to API Gateway, add `start:<name>` script and wire into `start:dev:all`.
