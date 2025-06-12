// Import Jest DOM matchers
import '@testing-library/jest-dom'

// Polyfill Web APIs for Node.js environment
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Request and Response for Next.js server components
global.Request = class Request {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.body = options.body
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body || '{}'))
  }
  
  text() {
    return Promise.resolve(this.body || '')
  }
}

global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.statusText = options.statusText || 'OK'
    this.headers = new Map(Object.entries(options.headers || {}))
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body))
  }
  
  text() {
    return Promise.resolve(this.body)
  }
}

// Mock Headers
global.Headers = class Headers extends Map {
  constructor(init) {
    super()
    if (init) {
      if (init instanceof Headers) {
        for (const [key, value] of init) {
          this.set(key, value)
        }
      } else if (Array.isArray(init)) {
        for (const [key, value] of init) {
          this.set(key, value)
        }
      } else {
        for (const [key, value] of Object.entries(init)) {
          this.set(key, value)
        }
      }
    }
  }
  
  get(name) {
    return super.get(name.toLowerCase())
  }
  
  set(name, value) {
    super.set(name.toLowerCase(), String(value))
  }
  
  has(name) {
    return super.has(name.toLowerCase())
  }
  
  delete(name) {
    return super.delete(name.toLowerCase())
  }
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock Next.js server functions
jest.mock('next/server', () => ({
  NextRequest: global.Request,
  NextResponse: {
    json: (data, init) => new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    }),
  },
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.POSTGRES_PRISMA_URL = 'postgresql://test:test@localhost:5432/test'
process.env.POSTGRES_URL_NON_POOLING = 'postgresql://test:test@localhost:5432/test'

// Global test utilities
global.console = {
  ...console,
  // Uncomment to ignore console logs during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

// Mock fetch globally
global.fetch = jest.fn()

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
}) 