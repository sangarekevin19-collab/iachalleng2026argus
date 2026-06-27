export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'aura',
    password: process.env.DB_PASSWORD || 'aura_password',
    name: process.env.DB_NAME || 'aura_os',
    schema: process.env.DB_SCHEMA || 'public',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || undefined,
  },

  jwt: {
    secret: process.env.JWT_SECRET || '',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '24h',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    otpExpiration: parseInt(process.env.JWT_OTP_EXPIRATION || '600', 10),
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'AURA OS <noreply@auraos.africa>',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'openrouter/owl-alpha',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT || '',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    bucket: process.env.S3_BUCKET || 'aura-os',
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },

  n8n: {
    url: process.env.N8N_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
    callbackUrl: process.env.N8N_CALLBACK_URL || '',
    defaultTimeout: parseInt(process.env.N8N_DEFAULT_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.N8N_MAX_RETRIES || '3', 10),
  },

  app: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'fr',
    supportedLanguages: ['fr', 'en', 'ar'],
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10),
    passcodeLength: 6,
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '2592000', 10),
  },
});
