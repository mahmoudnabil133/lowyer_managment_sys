# 🏛️ Lawyer Management System — Implementation Plan

> **Objective:** Complete existing microservices, build 4 new services, containerize, and set up CI/CD for a production-ready system.

---

## 🎨 Design System (for HTML version)

| Token | Value |
|---|---|
| **Primary** | `#1B2A4A` (Navy) |
| **Secondary** | `#C5A55A` (Gold accent) |
| **Background** | `#F7F5F0` (Warm cream) |
| **Card BG** | `#FFFFFF` |
| **Text** | `#2C2C2C` |
| **Success** | `#2E7D32` |
| **Warning** | `#E65100` |
| **Info** | `#1565C0` |

---

## 📋 Table of Contents

1. [Phase 0 — Foundation & Notification Service](#phase-0--foundation--notification-service)
2. [Phase 1 — Provider Service](#phase-1--provider-service)
3. [Phase 2 — AI Agents Service](#phase-2--ai-agents-service)
4. [Phase 3 — Document Service](#phase-3--document-service)
5. [Phase 4 — Analytics Service](#phase-4--analytics-service)
6. [Phase 5 — DevOps & Deployment](#phase-5--devops--deployment)
7. [Architecture — Final State](#architecture--final-state)
8. [Timeline Summary](#timeline-summary)

---

## 📦 Phase 0 — Foundation & Notification Service

**Goal:** Make the notification service functional (email + SMS) and fix existing issues.

### 🔧 0.1 — Wire MailerService to RMQ Handlers

| Step | Action | Files |
|---|---|---|
| 1 | Inject `MailerService` into `NotificationServiceController` | `apps/notification_service/src/notification.controller.ts` |
| 2 | Handle `@EventPattern('user_created')` — send welcome email | same |
| 3 | Handle `@EventPattern('appointment.booked')` — send booking confirmation | same |
| 4 | Handle `@EventPattern('appointment.cancelled')` — send cancellation notice | same |
| 5 | Add `sendWelcomeEmail`, `sendBookingConfirmation`, `sendCancellationNotice`, `sendReminder` methods to `MailerService` | `notification_service/src/nodemailer/mailer.service.ts` |
| 6 | Register `MailerModule` in `NotificationServiceModule` | `notification.module.ts` |
| 7 | Test with actual RMQ events | manual + Jest |

### 📧 0.2 — HTML Email Templates

| # | Template | Description |
|---|---|---|
| 1 | `welcome.html` | Logo, "Welcome!", name, verification link, footer |
| 2 | `booking-confirmation.html` | Appointment details, provider info, date/time, meeting link |
| 3 | `cancellation.html` | Cancellation notice, ref number, optional reschedule CTA |
| 4 | `reminder-24h.html` | "Your appointment is tomorrow" with details |
| 5 | `reminder-1h.html` | "Your appointment is in 1 hour" with meeting link |
| 6 | All templates responsive | Inline CSS, works on mobile/desktop |

### 📱 0.3 — SMS Provider (Twilio)

| Step | Action | Files |
|---|---|---|
| 1 | Install `twilio` package | `package.json` |
| 2 | Create `SmsService` with `sendSms(phone, message)` | `apps/notification_service/src/sms/sms.service.ts` |
| 3 | Add `SmsModule` with Twilio config (accountSid, authToken, fromNumber from env) | `apps/notification_service/src/sms/sms.module.ts` |
| 4 | Add SMS event handlers in `NotificationServiceController` | same controller |
| 5 | SMS templates: short, mobile-friendly strings | `sms/templates.ts` |

### ⚙️ 0.4 — Notification Preferences

| Step | Action | Files |
|---|---|---|
| 1 | Add `notificationPreferences` sub-schema to User: `{ email: { user_created, appointment_booked, ... }, sms: { ... } }` | `auth_service/src/user/schemas/user.schema.ts` |
| 2 | Create API: `GET /api/v1/notifications/preferences`, `PATCH /api/v1/notifications/preferences` | API Gateway + Auth RPC |
| 3 | Respect preferences in notification handlers — skip if user opted out | notification controller |

### ⏰ 0.5 — Appointment Reminders

| Step | Action | Files |
|---|---|---|
| 1 | Add `@nestjs/schedule` package | `package.json` |
| 2 | Create `ReminderScheduler` in notification service | `notification_service/src/scheduler/reminder-scheduler.ts` |
| 3 | Cron job: every 30 min, query appointments starting in ~24h where `reminder24hSent = false` | same |
| 4 | Emit `appointment.reminder_24h` event → handled as email + SMS | same |
| 5 | Same for 1h reminders with `reminder1hSent` field | same |
| 6 | Mark `reminder24hSent = true` / `reminder1hSent = true` after sending | RMQ to booking service |

### 🧹 0.6 — Audit & Refactor

| # | Check / Fix |
|---|---|
| 1 | Consistent error responses across all services |
| 2 | Missing `@UseFilters(CatchExceptionsFilter)` in new controllers |
| 3 | Add `ValidateObjectIdPipe` where missing |
| 4 | Ensure all RMQ patterns return proper error objects (not thrown exceptions into queue) |
| 5 | Run `npm run lint` and fix issues |

---

## 📦 Phase 1 — Provider Service

**Goal:** Dedicated microservice for provider profiles, credentials, ratings, search, and payouts.

### 🏗️ 1.1 — Scaffold Provider Service

| Step | Action |
|---|---|
| 1 | `nest generate app provider_service` |
| 2 | Add `provider_queue` to RMQ config |
| 3 | Set port 3005, add to `start:dev:all` script |
| 4 | Create `AppModule` with Mongoose, Config, JWT, RMQ |
| 5 | Add catch-all exception filter |

### 📋 1.2 — Provider Profile Schema & CRUD

**ProviderProfile Schema:**

| Field | Type |
|---|---|
| `userId` | ObjectId (ref: User) |
| `fullName` | String |
| `photoUrl` | String |
| `bio` | String (max 1000) |
| `specializations` | String[] |
| `languages` | String[] |
| `credentials` | Embedded[] (title, issuing org, year, verified) |
| `location` | { address, city, lat, lng } |
| `contactPhone` | String |
| `isVerified` | Boolean (default: false) |
| `averageRating` | Number (computed) |
| `totalReviews` | Number |
| `earnings` | { totalEarned, pendingPayouts, lifetime } |
| `createdAt/updatedAt` | Timestamps |

**CRUD APIs:**

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/providers` | JWT | List with search/filter/pagination |
| `GET` | `/api/v1/providers/:id` | JWT | Single profile |
| `POST` | `/api/v1/providers/me` | JWT | Create own profile |
| `PATCH` | `/api/v1/providers/:id` | JWT (owner/admin) | Update profile |

### 🎓 1.3 — Credentialing Workflow

| Step | Action |
|---|---|
| 1 | Add `Credential` sub-schema: `title, issuingOrganization, year, documentUrl, verified, verifiedBy, verifiedAt` |
| 2 | Provider uploads credential document → stored in document service or directly as URL |
| 3 | Admin endpoint: `PATCH /api/v1/admin/providers/:id/credentials/:credId/verify` |
| 4 | Admin dashboard: list unverified credentials |

### ⭐ 1.4 — Ratings & Reviews

**Review Schema:**

| Field | Type |
|---|---|
| `providerId` | ObjectId |
| `patientId` | ObjectId |
| `appointmentId` | ObjectId (unique — one review per appointment) |
| `rating` | Number (1–5) |
| `comment` | String (max 500) |
| `createdAt` | Timestamp |

**APIs:**

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/providers/:id/reviews` | JWT | Create review (after completed appointment) |
| `GET` | `/api/v1/providers/:id/reviews` | JWT | List reviews (paginated) |

Auto-compute `averageRating` and `totalReviews` on provider profile after each review.

### 🔍 1.5 — Provider Search API

| Parameter | Type | Description |
|---|---|---|
| `specialization` | String | Filter by specialization |
| `minRating` | Number (1-5) | Minimum average rating |
| `city` | String | Filter by location city |
| `language` | String | Filter by spoken language |
| `isVerified` | Boolean | Verified only |
| `page`, `limit` | Number | Pagination (default 10, max 50) |
| `sort` | String | `rating`, `totalReviews`, `createdAt` |

Text search on `fullName`, `bio`, `specializations` (MongoDB text index).

### 💰 1.6 — Provider Earnings & Payouts

| Step | Action |
|---|---|
| 1 | Earnings auto-updated when appointment is marked `completed` (listen to RMQ `appointment.completed`) |
| 2 | `POST /api/v1/providers/:id/payout-request` — request payout |
| 3 | Admin: `GET /api/v1/admin/payouts` — list pending |
| 4 | Admin: `PATCH /api/v1/admin/payouts/:id` — approve/reject |
| 5 | Payout history on provider profile |

### 🌐 1.7 — API Gateway Routes

| Endpoint | RMQ Pattern |
|---|---|
| `GET /api/v1/providers` | `provider.getList` |
| `GET /api/v1/providers/:id` | `provider.getById` |
| `PATCH /api/v1/providers/:id` | `provider.update` |
| `POST /api/v1/providers/me` | `provider.createMe` |
| `POST /api/v1/providers/:id/reviews` | `provider.createReview` |
| `GET /api/v1/providers/:id/reviews` | `provider.getReviews` |

---

## 📦 Phase 2 — AI Agents Service

**Goal:** Smart scheduling, no-show prediction, chatbot, document analysis, provider-patient matching.

### 🏗️ 2.1 — Scaffold AI Service

| Step | Action |
|---|---|
| 1 | `nest generate app ai_service` |
| 2 | Add `ai_queue` to RMQ config |
| 3 | Port 3006, add to `start:dev:all` |
| 4 | Module setup with Config, Mongoose, RMQ |

### 🤖 2.2 — Smart Scheduling Suggestions

| Step | Action |
|---|---|
| 1 | Accept `{ providerId, patientId, preferredDays[], preferredTimeOfDay }` |
| 2 | Analyze provider's past booking patterns → suggest optimal slots |
| 3 | Consider: buffer times, provider's busy days, patient history |
| 4 | Return top 3 suggested slots with reasoning |
| **API:** | `POST /api/v1/ai/suggest-slots` |

### 📊 2.3 — No-Show Risk Prediction

| Step | Action |
|---|---|
| 1 | Rule-based scoring: past no-shows (high weight), time of day, day of week, advance booking time |
| 2 | Score range: 0–100. Flag ≥ 70 as high risk |
| 3 | Auto-trigger on booking (booking service calls AI via RMQ) |
| 4 | High-risk → send extra confirmation prompts |
| **API:** | `POST /api/v1/ai/predict-no-show` → `{ riskScore, riskLevel, factors[] }` |

### 💬 2.4 — Chatbot (Basic NLP)

| Step | Action |
|---|---|
| 1 | Rule-based intent router: `parseMessage(text)` → `{ intent, entities }` |
| 2 | Intents: `book_appointment`, `cancel_appointment`, `reschedule`, `check_availability`, `faq`, `contact` |
| 3 | FAQ dataset: common lawyer-related Q&A (pricing, hours, specialization) |
| 4 | Context tracking: `conversationId` per session |
| 5 | Option: pluggable OpenAI backend for advanced understanding |
| **API:** | `POST /api/v1/ai/chat` → `{ reply, suggestedActions[] }` |

### 📄 2.5 — Document Auto-Classification

| Step | Action |
|---|---|
| 1 | Accept raw text / file URL |
| 2 | Classify: `contract`, `court_filing`, `affidavit`, `motion`, `discovery`, `other` |
| 3 | Extract: dates, party names, case numbers, monetary amounts |
| 4 | Option: integrate with OpenAI / local NLP model |
| **API:** | `POST /api/v1/ai/classify-document` → `{ type, confidence, entities[] }` |

### 🔗 2.6 — Provider-Patient Matching

| Step | Action |
|---|---|
| 1 | Input: `{ caseType, preferredLanguage, location, minRating }` |
| 2 | Score: specialization (60%), language (20%), location (10%), rating (10%) |
| 3 | Return top 3 matches with scores and profiles |
| **API:** | `POST /api/v1/ai/match-provider` |

---

## 📦 Phase 3 — Document Service

> **Detailed plan:** [`docs/phase-2-document.md`](./docs/phase-2-document.md)

**Goal:** Full document lifecycle — upload, store, version, share, OCR, e-sign.

### 🏗️ 3.1 — Scaffold Document Service

| Step | Action |
|---|---|
| 1 | `nest generate app document_service` |
| 2 | Add `document_queue` to RMQ config |
| 3 | Port 3007, add to `start:dev:all` |
| 4 | Install `multer`, `@types/multer`, `aws-sdk` (for S3) |

### 📤 3.2 — File Upload & Storage

| Step | Action |
|---|---|
| 1 | Create `FileUploadInterceptor` using Multer |
| 2 | Storage: local `./uploads/` (dev) / S3 (production, configurable via env) |
| 3 | Allowed MIME: PDF, DOC, DOCX, PNG, JPG, TIFF |
| 4 | Max file size: 20MB (configurable) |
| 5 | UUID filenames, keep original name in metadata |
| **API:** | `POST /api/v1/documents/upload` — multipart |

### 📁 3.3 — Document CRUD + Versioning

**Document Schema:**

| Field | Type |
|---|---|
| `_id` | ObjectId |
| `title` | String |
| `originalName` | String |
| `mimeType` | String |
| `size` | Number (bytes) |
| `storagePath` | String |
| `ownerId` | ObjectId (User) |
| `caseId` | ObjectId (optional) |
| `tags` | String[] |
| `versions` | Embedded[] (versionNumber, storagePath, uploadedBy, uploadedAt) |
| `currentVersion` | Number |
| `sharedWith` | Embedded[] (userId, permission) |
| `createdAt/updatedAt` | Timestamps |

**APIs:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/documents` | List own documents |
| `GET` | `/api/v1/documents/:id` | Get metadata |
| `GET` | `/api/v1/documents/:id/download` | Download current version |
| `PATCH` | `/api/v1/documents/:id` | Update title/tags |
| `DELETE` | `/api/v1/documents/:id` | Soft delete |
| `POST` | `/api/v1/documents/:id/versions` | Upload new version |
| `GET` | `/api/v1/documents/:id/versions` | List version history |

### 🔐 3.4 — Access Control & Sharing

| Step | Action |
|---|---|
| 1 | `POST /api/v1/documents/:id/share` — add `{ userId, permission }` |
| 2 | `DELETE /api/v1/documents/:id/share/:userId` — revoke |
| 3 | `GET /api/v1/documents/shared-with-me` — incoming shared docs |
| 4 | Access check middleware: owner = full, shared = limited by permission |

### 📝 3.5 — Document Templates

| Step | Action |
|---|---|
| 1 | `Template` schema: `name, category, content (with {{variables}}), isActive` |
| 2 | Admin CRUD for templates |
| 3 | `POST /api/v1/templates/:id/render` — pass variables → rendered document |
| 4 | Built-in: retainer agreement, fee agreement, intake form, NDA |

### 🔍 3.6 — OCR for Scanned Documents

| Step | Action |
|---|---|
| 1 | Install `tesseract.js` |
| 2 | On image/scanned PDF upload → trigger OCR job |
| 3 | Store extracted text in `Document.textContent` |
| 4 | Make text searchable via MongoDB text index |
| **API:** | `POST /api/v1/documents/:id/ocr` — manual re-OCR |

### ✍️ 3.7 — e-Signature

| Step | Action |
|---|---|
| 1 | `Signature` schema: `documentId, signerId, type (draw/type), signatureData, signedAt` |
| 2 | `POST /api/v1/documents/:id/sign` — capture signature |
| 3 | `GET /api/v1/documents/:id/signatures` — list signatories |
| 4 | Embed signature onto PDF via `pdf-lib` |
| 5 | Audit trail: IP, timestamp, user agent |

---

## 📦 Phase 4 — Analytics Service

**Goal:** Dashboards, reports, revenue tracking, provider performance.

### 🏗️ 4.1 — Scaffold Analytics Service

| Step | Action |
|---|---|
| 1 | `nest generate app analytics_service` |
| 2 | Add `analytics_queue` to RMQ config |
| 3 | Port 3008, add to `start:dev:all` |
| 4 | Module setup with Mongoose, Config, RMQ |

### 💵 4.2 — Revenue Analytics

| Step | Action |
|---|---|
| 1 | Listen to `payment.succeeded` RMQ event → update aggregates |
| 2 | `RevenueSnapshot` schema: `date, providerId, totalAmount, bookingCount, currency` |
| 3 | API: `GET /api/v1/analytics/revenue?period=&from=&to=&providerId=` |
| 4 | Returns: `{ totalRevenue, bookingCount, avgRevenuePerBooking, breakdownByProvider[] }` |
| 5 | Comparison: `% change from previous period` |

### 📈 4.3 — Appointment Metrics

| Step | Action |
|---|---|
| 1 | Listen to `appointment.*` events → update metrics |
| 2 | `AppointmentMetrics` schema: `date, total, confirmed, cancelled, noShow, completed, rescheduled` |
| 3 | API: `GET /api/v1/analytics/appointments` — same filters |
| 4 | Rates: `noShowRate`, `cancellationRate`, `completionRate` |

### 👨‍⚖️ 4.4 — Provider Performance

| Step | Action |
|---|---|
| 1 | Per-provider metrics: `totalAppointments, completed, revenue, avgRating, utilizationRate` |
| 2 | API: `GET /api/v1/analytics/providers/:id` — single provider |
| 3 | API: `GET /api/v1/analytics/providers` — leaderboard |
| 4 | Trends: weekly/monthly change across all metrics |

### 📊 4.5 — Dashboard API

| Endpoint | Returns |
|---|---|
| `GET /api/v1/analytics/dashboard` | `{ todayAppointments, revenueToday, noShowRate, activeProviders, pendingPayouts, recentActivity[] }` |

Cache: DB snapshot, refresh every 15 minutes.

### 📄 4.6 — Report Export

| Step | Action |
|---|---|
| 1 | Install `pdfkit` or `jspdf` for PDF generation |
| 2 | `GET /api/v1/analytics/reports/revenue?format=pdf|csv&from=&to=` |
| 3 | `GET /api/v1/analytics/reports/appointments?format=pdf|csv&from=&to=` |
| 4 | CSV: flat rows, Excel-compatible |
| 5 | PDF: structured report with header, date range, tables, totals |

---

## 📦 Phase 5 — DevOps & Deployment

**Goal:** Containerize, automate CI/CD, deploy to production.

### 🐳 5.1 — Dockerfiles (Per Service)

| Step | Instruction |
|---|---|
| 1 | Base image: `node:20-alpine` |
| 2 | Multi-stage: `deps` → `build` → `production` |
| 3 | Copy only `dist/` and `node_modules` (production) into final stage |
| 4 | Expose service port |
| 5 | `HEALTHCHECK` — `curl --fail http://localhost:{port}/health` |

### 📦 5.2 — docker-compose.yml (Dev)

| Service | Image | Port |
|---|---|---|
| `mongo` | `mongo:7` (replica set) | 27017 |
| `rabbitmq` | `rabbitmq:3-management` | 5672, 15672 |
| `api-gateway` | build context: `apps/api-gateway` | 3010 |
| `auth-service` | build context: `apps/auth_service` | 3001 |
| `booking-service` | build context: `apps/booking_service` | 3002 |
| `notification-service` | build context: `apps/notification_service` | 3003 |
| `payment-service` | build context: `apps/payment_service` | 3004 |
| `provider-service` | build context: `apps/provider_service` | 3005 |
| `ai-service` | build context: `apps/ai_service` | 3006 |
| `document-service` | build context: `apps/document_service` | 3007 |
| `analytics-service` | build context: `apps/analytics_service` | 3008 |

Volumes: `mongo_data`, `rmq_data`, `uploads`
Network: `lawyer_network`

### 🚀 5.3 — docker-compose.prod.yml

| Feature | Config |
|---|---|
| Restart policy | `always` |
| Logging | `json-file` driver with rotation |
| Resource limits | CPU/Memory per service |
| Secrets | Docker secrets for `.env` |
| Healthchecks | On all services |
| Reverse proxy | Traefik or Nginx (SSL termination) |

### 🤖 5.4 — CI/CD (GitHub Actions)

```yaml
name: Deploy
on:
  push:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test

  build-and-push:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & push Docker images
        run: |
          docker compose -f docker-compose.prod.yml build
          docker push ...

  deploy:
    needs: [build-and-push]
    runs-on: ubuntu-latest
    steps:
      - name: SSH & deploy
        run: |
          ssh $SERVER "docker compose pull && docker compose up -d"
```

### ☁️ 5.5 — Deployment Target Options

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **AWS ECS** (Fargate) | Managed, auto-scaling | Higher cost, AWS lock-in | ✅ If budget allows |
| **DigitalOcean App Platform** | Simple, fixed pricing | Less control | ✅ Good mid-tier |
| **Docker Swarm** | Simple, no extra cost | Manual management | ✅ Best start point |
| **Kubernetes (K3s)** | Industry standard | Steep learning curve | ⏸ When scaling |

**Recommended start:** Docker Swarm → migrate to K8s if needed.

### 🔐 5.6 — Secrets Management

| Secret | Source |
|---|---|
| `MONGO_URI` | MongoDB Atlas |
| `RMQ_URL` | CloudAMQP |
| `JWT_SECRETS` | Generated (rotate monthly) |
| `SMTP_CREDENTIALS` | Gmail app password |
| `TWILIO_CREDENTIALS` | Twilio account |
| `STRIPE_KEYS` | Stripe dashboard |
| `OPENAI_KEY` | OpenAI (if used) |

Storage: GitHub Secrets → injected as env in CI/CD → Docker secrets in production.

### 📊 5.7 — Monitoring & Logging

| Step | Action |
|---|---|
| 1 | `/health` endpoint on every service (uptime, DB status) |
| 2 | Centralized logging: ELK stack or Grafana Loki |
| 3 | Metrics: Prometheus + Grafana (CPU, memory, latency, queue depth) |
| 4 | Alerts: Slack/Email on service down, error spike, queue backup |
| 5 | Uptime monitoring: UptimeRobot / BetterStack (free tier) |

---

## 📐 Architecture — Final State

```
                          ┌──────────────┐
                          │   Frontend    │ (Future)
                          └──────┬───────┘
                                 │ HTTPS
                          ┌──────▼───────┐
                          │  API Gateway  │ :3010
                          │  Swagger, JWT │
                          │  Throttling   │
                          └──┬──┬──┬──┬──┘
                     ┌───────┘  │  │  └───────┐
                     │  RabbitMQ│  │  RMQ      │
               ┌─────▼──┐ ┌────▼──▼──┐ ┌─────▼──┐
               │ Auth   │ │ Booking  │ │Payment │
               │ :3001  │ │ :3002    │ │ :3004  │
               └────┬───┘ └────┬─────┘ └────┬───┘
                    │          │             │
               ┌────▼──────────▼─────────────▼──┐
               │      Notification :3003        │
               │   Email (Nodemailer) + SMS     │
               └────────────────────────────────┘
               ┌───────────┐ ┌───────────┐
               │  Provider │ │  AI Agent │
               │  :3005    │ │  :3006    │
               └───────────┘ └───────────┘
               ┌───────────┐ ┌───────────┐
               │ Document  │ │ Analytics │
               │  :3007    │ │  :3008    │
               └───────────┘ └───────────┘

               MongoDB Atlas ──── 9 services
               RabbitMQ Cloud ─── Message bus
               Docker ─────────── Container runtime
               GitHub Actions ─── CI/CD pipeline
```

---

## 📅 Timeline Summary

| Phase | Tasks | Est. Days | Parallelizable? |
|---|---|---|---|
| **0 — Foundation** | 0.1 → 0.6 | ~11 | Sequential |
| **1 — Provider** | 1.1 → 1.7 | ~12 | Partial (1.4+1.5 with 1.6) |
| **2 — AI Agents** | 2.1 → 2.6 | ~16 | Partial (2.4+2.5 with 2.6) |
| **3 — Document** | 3.1 → 3.7 | ~16 | Partial (3.5+3.6+3.7) |
| **4 — Analytics** | 4.1 → 4.6 | ~11 | Partial (4.5+4.6) |
| **5 — DevOps** | 5.1 → 5.7 | ~13 | Partial (5.1+5.2) |

**Optimal parallel execution:**
- Phase 0 → sequential start
- Phase 1 → starts after Phase 0
- Phases 2, 3, 4 → can run in parallel with Phase 1
- Phase 5 → runs alongside final phases

**Total estimated: ~45–55 days (with parallelization)**
