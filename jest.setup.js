// Optional: configure or set up a testing framework before each test.
import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.GROQ_API_KEY = 'test-key'
process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io'
process.env.NEON_DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret-key-at-least-32-characters-long'