# API Documentation

## Authentication

All API endpoints (except `/api/auth/login`) require authentication via Bearer token in the Authorization header.

```
Authorization: Bearer <access_token>
```

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication Endpoints

### POST /api/auth/login

Authenticate user and receive access token.

**Request Body:**
```json
{
  "username": "string (required, 1-50 chars, alphanumeric + underscore)",
  "password": "string (required, 1-100 chars)"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "string",
    "username": "string",
    "role": "admin | exchange",
    "exchange_id": "string (optional)",
    "exchange_name": "string (optional)"
  },
  "access_token": "string",
  "message": "Login successful"
}
```

**Error Responses:**
- `400`: Invalid request data
- `401`: Authentication failed
- `429`: Rate limit exceeded (5 attempts per 15 minutes)
- `500`: Server error

## Order Management Endpoints

### GET /api/orders

Get paginated list of orders.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `status` (optional): Filter by status
- `type` (optional): Filter by type (INCOMING | OUTGOING)

**Success Response (200):**
```json
{
  "orders": [
    {
      "id": "string",
      "orderNumber": "string",
      "type": "INCOMING | OUTGOING",
      "status": "SUBMITTED | PENDING_REVIEW | APPROVED | REJECTED | PROCESSING | COMPLETED | CANCELLED",
      "amount": "number",
      "commission": "number",
      "netAmount": "number",
      "senderName": "string",
      "recipientName": "string",
      "bankName": "string",
      "createdAt": "string (ISO date)",
      "updatedAt": "string (ISO date)",
      "exchange": {
        "id": "string",
        "name": "string"
      }
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

### POST /api/orders

Create a new order.

**Request Body (Incoming Order):**
```json
{
  "type": "INCOMING",
  "amount": "string (decimal)",
  "bankName": "string (2-50 chars)",
  "senderName": "string (optional, 2-50 chars)",
  "paymentProofUrl": "string (optional, valid URL)"
}
```

**Request Body (Outgoing Order):**
```json
{
  "type": "OUTGOING",
  "amount": "string (decimal)",
  "cliqBankAliasName": "string (2-30 chars)",
  "cliqMobileNumber": "string (Jordanian mobile format)",
  "recipientName": "string (optional, 2-50 chars)",
  "bankName": "string (optional, 2-50 chars)"
}
```

### GET /api/orders/{id}

Get order details by ID.

### PUT /api/orders/{id}/status

Update order status (Admin only).

**Request Body:**
```json
{
  "status": "APPROVED | REJECTED | PROCESSING | COMPLETED",
  "rejectionReason": "string (optional, required for REJECTED status)"
}
```

## Admin Endpoints

### GET /api/admin/dashboard

Get admin dashboard statistics.

**Success Response (200):**
```json
{
  "totalOrders": "number",
  "totalOrdersChange": "number (percentage)",
  "pendingOrders": "number",
  "pendingOrdersChange": "number (percentage)",
  "completedOrders": "number",
  "completedOrdersChange": "number (percentage)",
  "totalExchanges": "number",
  "exchangesChange": "number (percentage)",
  "totalVolume": "number",
  "todayVolume": "number",
  "volumeChange": "number (percentage)",
  "avgProcessingTime": "number (hours)",
  "systemHealth": "good | warning | critical"
}
```

### GET /api/admin/exchanges

Get list of all exchanges.

### POST /api/admin/exchanges

Create new exchange (Admin only).

## Exchange Endpoints

### GET /api/exchange/stats

Get exchange-specific statistics.

### GET /api/exchange/orders

Get orders for the authenticated exchange.

## Error Response Format

All error responses follow this format:

```json
{
  "error": "string (error type)",
  "message": "string (human-readable message)",
  "code": "string (error code)",
  "details": "object (optional, validation errors)"
}
```

## Common Error Codes

- `VALIDATION_ERROR`: Invalid request data
- `AUTH_FAILED`: Authentication failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `METHOD_NOT_ALLOWED`: HTTP method not supported
- `INTERNAL_ERROR`: Server error
- `ACCESS_DENIED`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource not found

## Rate Limiting

- Login endpoint: 5 attempts per 15 minutes per IP
- Other endpoints: 100 requests per minute per user

## File Upload

For endpoints that support file uploads, use multipart/form-data:

- Maximum file size: 5MB
- Allowed formats: PNG, JPG, JPEG
- Files are compressed and optimized automatically

## Webhook Events (Future)

The system supports webhooks for real-time notifications:

- `order.created`
- `order.status_changed`
- `order.completed`
- `message.received`

## SDK Examples

### JavaScript/TypeScript

```typescript
class FinancialTransferAPI {
  private baseUrl: string
  private accessToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async login(username: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    
    if (!response.ok) {
      throw new Error('Login failed')
    }
    
    const data = await response.json()
    this.accessToken = data.access_token
    return data.user
  }

  async getOrders(params?: { page?: number; limit?: number }) {
    return this.request('GET', '/orders', params)
  }

  async createOrder(orderData: any) {
    return this.request('POST', '/orders', orderData)
  }

  private async request(method: string, endpoint: string, data?: any) {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    
    if (method === 'GET' && data) {
      Object.entries(data).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: method !== 'GET' ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Request failed')
    }

    return response.json()
  }
}

// Usage
const api = new FinancialTransferAPI('https://your-domain.com/api')
await api.login('username', 'password')
const orders = await api.getOrders({ page: 1, limit: 10 })
```

## Testing

Use the provided test suite to verify API functionality:

```bash
# Run API tests
npm run test:api

# Run integration tests
npm run test:integration

# Test specific endpoint
npm run test -- --grep "login"
``` 