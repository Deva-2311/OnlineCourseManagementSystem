export default () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  frontendUrl: process.env.FRONTEND_URL,
  database: {
    url: process.env.DATABASE_URL,
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED === 'true',
    path: process.env.SWAGGER_PATH || '/api-docs',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_key_123456789',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_super_secure_key_987654321',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '20', 10),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder_key',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder_secret',
    successUrl:
      process.env.STRIPE_SUCCESS_URL ||
      'http://localhost:3000/student/enrollments?payment=success&session_id={CHECKOUT_SESSION_ID}',
    cancelUrl:
      process.env.STRIPE_CANCEL_URL ||
      'http://localhost:3000/courses/{COURSE_ID}?payment=cancelled',
    currency: process.env.STRIPE_CURRENCY || 'usd',
  },
  email: {
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    fromAddress: process.env.EMAIL_FROM || 'noreply@ocms.local',
  },
});
