/**
 * Test setup — configure environment variables for test runs.
 * All tests run with mock AI mode (no real API calls).
 */

// Set required env vars before any imports
process.env['JWT_SECRET'] = 'test-secret-key-for-testing-only-not-production';
process.env['JWT_EXPIRES_IN'] = '1h';
process.env['DATABASE_URL'] = ':memory:'; // Use in-memory SQLite for tests
process.env['PORT'] = '3099';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
process.env['SIMULATOR_TICK_MS'] = '999999'; // Prevent simulator ticks during tests
// No ANTHROPIC_API_KEY → triggers mock mode — no real API calls in tests
