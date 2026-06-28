## Plan: Fix Booking Service and Complete Microservice Project

TL;DR: The booking service currently has missing module wiring, absent auth guard files, and logic inconsistencies. The plan fixes booking service registration, auth integration, Mongo/RabbitMQ wiring, slot/appointment logic, then verifies by build/test and audits the remaining microservices.

**Steps**
1. Audit the booking service root module and controller wiring.
   - Identify missing controllers and providers in `apps/booking_service/src/booking_service.module.ts`.
   - Verify that `AvailabilityController`, `AppointmentController`, and `ScheduleController` are imported and registered.
   - Remove or clean up the unused `BookingServiceService` file if it is not part of the final app.

2. Add missing booking service auth and decorator support.
   - Create `apps/booking_service/src/decorators/roles.decorator.ts` matching the auth service implementation.
   - Create `apps/booking_service/src/guards/jwt-auth.guard.ts` extending `AuthGuard('jwt')`.
   - Create `apps/booking_service/src/guards/roles.guard.ts` using `Reflector` like the auth service.
   - Create a simple JWT strategy in `apps/booking_service/src/auth/jwt-strategy/jwt-strategy.service.ts` that validates the JWT payload and returns `user` info.
   - Import `PassportModule`, `JwtModule`, and the new JWT strategy into the booking service module.

3. Wire database and RabbitMQ dependencies for booking service.
   - Import `ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })` in `booking_service.module.ts`.
   - Add `MongooseModule.forRootAsync(...)` using `Mongo_Uri` from env.
   - Add `MongooseModule.forFeature(...)` for `Appointment`, `AppointmentHistory`, `TimeSlot`, and `ProviderSchedule` schemas.
   - Add RabbitMQ module registration so `AmqpConnection` is available to `AppointmentService`.
   - Confirm `booking_service/src/main.ts` remains valid once the module imports `ConfigModule`.

4. Fix booking service logic bugs in existing services.
   - In `AvailabilityService.getAvailabilityRage`, correct the date validation condition and ensure `from`/`to` ordering is handled properly.
   - Fix `releaseSlot` in `AvailabilityService` to update `heldExpireDate` with the correct field name and preserve consistent slot field naming.
   - Fix `SlotGeneratorService.releaseExpiredHolds` to query/update the actual hold fields (`heldExpireDate` and `holdBy`) rather than non-existent `holdExpiresAt` and `heldByPatientId`.
   - Add an explicit slot lookup method in `AvailabilityService` so `AppointmentService` does not rely on `availabilityService['slotModel']`.
   - Consider strengthening `confirmSlotBooking` to deny booking a valid hold held by another patient.

5. Ensure module providers and controllers are complete.
   - Register `AppointmentService`, `AvailabilityService`, and `SlotGeneratorService` in `booking_service.module.ts`.
   - Register `JwtStrategyService`, `RolesGuard`, and controller classes.
   - Confirm schema models are imported from `apps/booking_service/src/models/*.schema.ts`.

6. Test and verify the booking service.
   - Run a targeted TypeScript build or linter on `apps/booking_service`.
   - Run booking service unit tests and e2e tests using existing commands.
   - Validate that missing imports are resolved and endpoints start without runtime injection errors.

7. Audit the entire microservice project after booking service normalization.
   - Run `npm run build` at the repo root to catch any cross-app compile issues.
   - Run `npm test` and `npm run test:e2e` for all apps if possible.
   - Inspect `apps/auth_service` and `apps/notification_service` for similar module wiring or shared-config issues.

**Relevant files**
- `apps/booking_service/src/booking_service.module.ts` — root module wiring
- `apps/booking_service/src/booking_service.controller.ts` — controller route registration and guard usage
- `apps/booking_service/src/services/avaiilability.service.ts` — availability logic and release slot bug
- `apps/booking_service/src/services/slot-generator.service.ts` — expired hold cleanup and slot generation logic
- `apps/booking_service/src/services/appointment.service.ts` — slot lookup pattern, event publishing and transaction flow
- `apps/booking_service/src/models/*.schema.ts` — schema registration for Mongoose
- `apps/auth_service/src/auth/Roles/roles.guard.ts` and `apps/auth_service/src/common/decorators/roles.decorator.ts` — reference implementation for guard/decorator behavior
- `apps/auth_service/src/app.module.ts` — example of Mongoose/Config root wiring

**Verification**
1. Build the booking service: run `npm run build` or `nest build` from repo root.
2. Run booking service tests: `npm run test` and `npm run test:e2e` if configured.
3. Confirm booking service starts and the three controllers are available.
4. Confirm no TS errors remain in `apps/booking_service/src/**/*`.
5. Run a repo-level audit build across `apps/auth_service` and `apps/notification_service`.

**Decisions**
- Use local booking service auth guard/decorator files rather than importing from the auth microservice, because the repo has no shared auth library path.
- Keep `AmqpConnection` event publishing if RabbitMQ is part of the intended microservice design, but register the RabbitMQ module explicitly.
- Treat the booking service as the first completion step, then perform a smaller cross-service audit to finish the microservice project.

**Further Considerations**
1. If the project should share auth behavior across services, create a library under `libs/auth` rather than duplicating guard/decorator logic.
2. If RabbitMQ integration is not required immediately, simplify by removing or stubbing event publishing until the rest of the architecture is stable.
3. Verify environment variables and `.env` file support for `Mongo_Uri`, `access_secret`, `RMQ_URL`, and booking service port.
