// Jest setup file

// Mock global objects that might not be available in test environment
global.mongoose = {
  conn: null,
  promise: null
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  // Reset global mongoose cache
  global.mongoose = {
    conn: null,
    promise: null
  };
});