const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
if (!GROQ_API_KEY) {
  console.warn('\nWARNING: GROQ_API_KEY is not set in .env! Backend AI features will fail.\n');
}

module.exports = {
  PORT: process.env.PORT || 3001,
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'groq', // groq | ollama
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  LOCAL_MODEL: process.env.LOCAL_MODEL || 'phi3:mini', // Use phi3:mini for speed
  DB_PATH: process.env.DB_PATH || path.resolve(__dirname, '../data/socrates.db'),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
    .split(',').map(origin => origin.trim()).filter(Boolean),
  MAX_CLARIFY_ROUNDS: 10,
  QA_PASS_SCORE: 0.70,
  JWT_SECRET: process.env.JWT_SECRET || 'socrates-secret-change-in-prod',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'SOCRATES <no-reply@socrates.app>',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID || '',
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET || '',
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN || '',
  APP_URL: process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  ADMIN_EMAILS: (process.env.ADMIN_EMAILS || 'vermaanni2003@gmail.com').split(',').map(e => e.trim().toLowerCase()).filter(e => e),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
};