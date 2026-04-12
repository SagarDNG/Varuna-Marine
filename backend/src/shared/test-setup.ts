// Load test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fueleu_test';
