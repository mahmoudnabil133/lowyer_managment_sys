## Plan: Expand to a Full Lawyer/Booking Microservice Platform

TL;DR: After stabilizing the booking service, extend the system into a full microservice platform with payment, provider management, patient records, reporting, and audit services. Keep the same NestJS + MongoDB + RabbitMQ architecture, reuse shared libs, and define service boundaries for stable event-driven integration.

**Steps**
1. Stabilize the current core services first.
   - Apply the booking service fix plan from earlier.
   - Ensure `auth_service`, `booking_service`, and `notification_service` all build and run.
   - Confirm current event contracts and shared types before adding new services.

2. Define the new service boundary set.
   - `payment_service`: payments, invoices, refunds, payment methods, transactions.
   - `provider_service`: lawyer/provider profiles, specialties, fees, credentials, ratings.
   - `patient_service`: patient records, documents, insurance details, history.
   - `reporting_service`: revenue reports, appointment stats, operational dashboards.
   - `audit_service` (optional): immutable audit trails and access logs for compliance.
   - Keep `notification_service` as shared notification delivery.

3. Create shared libraries for cross-service contracts.
   - `libs/common`: common enums, DTOs, helper utilities, exception filters, validation pipes.
   - `libs/rmq`: event schema definitions, queue names, exchange names, message types.
   - `libs/auth` or `libs/shared-auth` if auth guard/decorator logic should be reused.

4. Implement `payment_service`.
   - Endpoints:
     - `POST /payments/checkout` – create payment intent for appointment or invoice.
     - `POST /payments/confirm` – confirm or capture payment.
     - `POST /payments/refund` – request refund for an appointment.
     - `GET /payments/:id` – payment details.
     - `GET /payments/customer/:customerId` – payment history.
     - `GET /invoices/:id` – invoice details.
   - Schema:
     - `PaymentTransaction`: `appointmentId`, `providerId`, `patientId`, `amount`, `currency`, `paymentMethod`, `status`, `processorReference`, `createdAt`, `updatedAt`.
     - `Invoice`: `invoiceNumber`, `transactionId`, `appointmentId`, `providerId`, `patientId`, `lineItems`, `total`, `tax`, `status`, `issuedAt`, `dueDate`.
     - `PaymentMethod`: `customerId`, `type`, `last4`, `expiry`, `provider`, `isDefault`.
   - Integration:
     - Consume booking events `appointment.booked`, `appointment.cancelled`, `appointment.rescheduled`.
     - Publish `payment.completed`, `payment.refunded`, `invoice.generated`.
     - Handle external webhook events from payment gateway if required.

5. Implement `provider_service`.
   - Endpoints:
     - `POST /providers` – create provider profile.
     - `GET /providers/:id` – get provider details.
     - `PATCH /providers/:id` – update profile and availability metadata.
     - `GET /providers` – search providers by specialty, location, availability.
     - `POST /providers/:id/ratings` – add provider rating/review.
   - Schema:
     - `ProviderProfile`: `userId`, `displayName`, `specialties`, `bio`, `licenseNumber`, `credentials`, `languages`, `officeLocation`, `hourlyRate`, `status`, `createdAt`, `updatedAt`.
     - `ProviderRating`: `providerId`, `patientId`, `rating`, `review`, `appointmentId`, `createdAt`.
   - Integration:
     - Emit `provider.updated` and `provider.profile.created` events.
     - Allow booking service to query provider profile existence and fees via direct DB or API.

6. Implement `patient_service`.
   - Endpoints:
     - `POST /patients` – create patient record.
     - `GET /patients/:id` – fetch patient demographics and history.
     - `PATCH /patients/:id` – update patient details.
     - `GET /patients/:id/documents` – list uploaded documents.
     - `POST /patients/:id/documents` – upload medical/legal documents.
   - Schema:
     - `PatientRecord`: `userId`, `fullName`, `phone`, `email`, `dateOfBirth`, `gender`, `address`, `insurance`, `emergencyContact`, `createdAt`, `updatedAt`.
     - `PatientDocument`: `patientId`, `type`, `title`, `url`, `uploadedBy`, `uploadedAt`.
   - Integration:
     - Listen for `user.created` from auth to create base patient/customer record.
     - Publish `patient.updated` and `patient.document.added`.

7. Expand `notification_service` into a full delivery service.
   - Endpoints:
     - `GET /notifications/status` – service health.
   - Events to handle:
     - `user.created`, `appointment.booked`, `appointment.cancelled`, `appointment.rescheduled`, `payment.completed`, `invoice.generated`.
   - Schema:
     - `Notification`: `recipientId`, `type`, `channel`, `payload`, `status`, `sentAt`, `attempts`, `error`.
   - Add support for email, SMS, and push notifications if desired.

8. Add `reporting_service`.
   - Endpoints:
     - `GET /reports/appointments` – appointment counts, cancellations, no-shows.
     - `GET /reports/revenue` – payments, refunds, outstanding invoices.
     - `GET /reports/providers` – provider utilization, average rating.
   - Schema:
     - `ReportRequest`: `fromDate`, `toDate`, `groupBy`, `metrics`.
     - `AggregationResult`: `label`, `value`, `metadata`.
   - Integration:
     - Consume business events from booking, payment, provider services.
     - Store aggregates in Mongo or a dedicated analytics collection.

9. Add `audit_service` if compliance is required.
   - Endpoints:
     - `GET /audit/logs` – query audit actions by user, entity, date range.
     - `POST /audit/events` – ingest external audit data.
   - Schema:
     - `AuditLog`: `service`, `entityId`, `entityType`, `action`, `performedBy`, `role`, `details`, `timestamp`.
   - Integration:
     - Publish audit events from booking, payment, provider, auth services.
     - Keep immutable logs and retention metadata.

10. Create an API gateway or client-facing aggregator (optional).
   - Single entry point for web/mobile clients.
   - Routes can proxy to `auth_service`, `booking_service`, `provider_service`, `payment_service`, `patient_service`.
   - Support API versioning, request aggregation, JWT forwarding, and rate limiting.

11. Establish cross-service contracts and shared event definitions.
   - Define event names in `libs/rmq/src/events.ts`, e.g. `USER_CREATED`, `APPOINTMENT_BOOKED`, `PAYMENT_COMPLETED`.
   - Define DTOs in shared libs: `UserPayload`, `AppointmentEventPayload`, `PaymentEventPayload`.
   - Keep shared schema only for lightweight contract types, not full entity models.

12. Validate and test the expanded platform.
   - Create dedicated unit tests for each new service module.
   - Add integration tests for event flows: booking → payment → notification.
   - Run `npm run test`, `npm run test:e2e`, and `npm run build` across the monorepo.
   - Add smoke tests for the payment checkout and appointment booking happy path.

**Relevant files and paths to add**
- `apps/payment_service/src/payment_service.module.ts`
- `apps/payment_service/src/payment_service.controller.ts`
- `apps/payment_service/src/services/payment.service.ts`
- `apps/provider_service/src/provider_service.module.ts`
- `apps/provider_service/src/providers/provider.controller.ts`
- `apps/provider_service/src/services/provider.service.ts`
- `apps/patient_service/src/patient_service.module.ts`
- `apps/patient_service/src/patients/patient.controller.ts`
- `apps/patient_service/src/services/patient.service.ts`
- `apps/reporting_service/src/reporting_service.module.ts`
- `apps/reporting_service/src/services/reporting.service.ts`
- `apps/audit_service/src/audit_service.module.ts`
- `libs/rmq/src/events.ts`
- `libs/auth/src` if auth code is shared across services
- `libs/common/src/dtos/*` for shared contract DTOs

**Verification**
1. Ensure each new service compiles independently with `nest build`.
2. Create and run service-level unit tests for endpoints and schema validation.
3. Run end-to-end event flow tests covering booking → payment → notification.
4. Validate that RabbitMQ event listeners start and that the queue names are consistent.
5. Confirm the monorepo build passes and all services can run concurrently.

**Decisions**
- Keep the current NestJS + MongoDB + RabbitMQ style as the system backbone.
- Use one event bus for async integration, with each service owning its own MongoDB collections.
- Add shared contract libraries only for event and auth types, not full schema duplication.

**Further Considerations**
1. If you need PCI-compliant payment support, keep raw payment data out of Mongo and use tokenized payment methods.
2. If provider search is important, add a dedicated search service with Elasticsearch or MongoDB text indexes.
3. If the system will support multi-tenant firms, add tenant isolation in auth and data filtering early.
