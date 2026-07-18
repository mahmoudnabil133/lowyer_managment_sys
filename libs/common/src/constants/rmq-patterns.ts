export const NOTIFICATION_PATTERNS = {
    USER_CREATED: 'user_created',
    USER_VERIFIED: 'user.verified',
    PASSWORD_RESET: 'user.password_reset',
    APPOINTMENT_BOOKED: 'appointment.booked',
    APPOINTMENT_CANCELLED: 'appointment.cancelled',
    APPOINTMENT_RESCHEDULED: 'appointment.rescheduled',
    REMINDER_24H: 'appointment.reminder_24h',
    REMINDER_1H: 'appointment.reminder_1h',
    PAYMENT_SUCCEEDED: 'payment.succeeded',
    PAYOUT_REQUESTED: 'payout.requested',
} as const;

export const BOOKING_PATTERNS = {
    GET_APPOINTMENTS: 'booking.getAppointments',
    MARK_REMINDER_SENT: 'booking.markReminderSent',
} as const;

export const PROVIDER_PATTERNS = {
    // Profile CRUD
    GET_LIST: 'provider.getList',
    GET_BY_ID: 'provider.getById',
    CREATE_ME: 'provider.createMe',
    UPDATE: 'provider.update',

    // Reviews
    CREATE_REVIEW: 'provider.createReview',
    GET_REVIEWS: 'provider.getReviews',

    // Admin
    VERIFY_CREDENTIAL: 'provider.verifyCredential',
    LIST_UNVERIFIED_CREDENTIALS: 'provider.listUnverifiedCredentials',

    // Search
    SEARCH: 'provider.search',
} as const;
export const AUTH_PATTERNS = {
    GET_USER: 'auth.getUser',
    GET_USER_PREFERENCES: 'auth.getUserPreferences',
    UPDATE_USER_PREFERENCES: 'auth.updateUserPreferences',
} as const;

export const QUEUES = {
    AUTH: 'auth_queue',
    BOOKING: 'booking_queue',
    NOTIFICATION: 'notification_queue',
    PAYMENT: 'payment_queue',
    PROVIDER: 'provider_queue',
    AI: 'ai_queue',
    DOCUMENT: 'document_queue',
    ANALYTICS: 'analytics_queue',
} as const;