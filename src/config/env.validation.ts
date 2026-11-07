import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  TRUST_PROXY: Joi.boolean().default(false),
  CORS_ORIGINS: Joi.string()
    .optional()
    .description(
      'Comma-separated allowed origins; unset allows all (dev only)',
    ),

  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),
  // 32 random bytes, base64. Encrypts medical free-text fields at rest.
  DATA_ENCRYPTION_KEY: Joi.string().base64().length(44).required(),
  REMINDERS_ENABLED: Joi.boolean().default(true),
  ACCESS_TOKEN_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).default(30),
  AUTH_RATE_LIMIT_MAX: Joi.number().integer().min(1).default(10),

  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().optional(),

  PLACES_BASE_URL: Joi.string()
    .uri()
    .default('https://nominatim.openstreetmap.org'),
  PLACES_COUNTRY_CODES: Joi.string().allow('').default('in'),
  PLACES_CONTACT_EMAIL: Joi.string().email().optional(),
});
