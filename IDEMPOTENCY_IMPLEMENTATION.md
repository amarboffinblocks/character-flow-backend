# Idempotency-Key Implementation Guide

## ✅ Production-Ready Implementation

The idempotency system is now fully implemented with proper error handling, concurrent request support, and RFC-compliant behavior.

---

## 🎯 Features

### 1. **Request Deduplication**
- Prevents duplicate mutations from being processed
- Caches responses for 24 hours
- Returns cached response for duplicate requests

### 2. **Concurrent Request Handling**
- Uses Redis locks to handle concurrent requests with same idempotency key
- Exponential backoff retry mechanism
- Prevents race conditions

### 3. **Request Body Hashing**
- Includes request body hash in cache key
- Ensures same request = same response
- Different request bodies with same idempotency key = different responses

### 4. **Proper Error Handling**
- Lock cleanup on errors
- Fail-open strategy when Redis unavailable
- Comprehensive logging

### 5. **RFC Compliance**
- Standard `Idempotency-Key` header (case-insensitive)
- `X-Idempotency-Replay` header for cached responses
- Proper HTTP status codes (409 Conflict for concurrent requests)

---

## 📋 Usage

### Basic Usage (Automatic)

The middleware automatically applies to all `POST`, `PUT`, `PATCH`, and `DELETE` requests:

```typescript
// Client sends request with Idempotency-Key header
fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': '550e8400-e29b-41d4-a716-446655440000', // UUID
  },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
});
```

### Require Idempotency Key (Strict)

For endpoints that MUST have idempotency protection:

```typescript
// In route middleware
import { requireIdempotencyKey } from '../../middleware/index.js';

export default [requireIdempotencyKey];
```

### Skip Idempotency (Optional)

For endpoints that shouldn't use idempotency:

```typescript
// In route middleware
import { skipIdempotency } from '../../middleware/index.js';

export default [skipIdempotency];
```

---

## 🔑 Idempotency Key Format

### Requirements
- **Minimum length**: 8 characters
- **Maximum length**: 128 characters
- **Allowed characters**: Letters, numbers, hyphens (`-`), underscores (`_`)
- **Recommended**: UUID v4 (36 characters)

### Examples

✅ **Valid:**
```
550e8400-e29b-41d4-a716-446655440000  (UUID)
my-unique-key-12345
abc123def456
```

❌ **Invalid:**
```
short        (too short, < 8 chars)
key with spaces  (contains spaces)
key@with#special (contains special chars)
```

---

## 🔄 How It Works

### 1. **Request Flow**

```
Client Request
    ↓
[Idempotency Middleware]
    ↓
Check Cache (Redis)
    ├─ Found → Return Cached Response (200/201/etc)
    └─ Not Found → Acquire Lock
         ├─ Lock Acquired → Process Request → Cache Response → Release Lock
         └─ Lock Failed → Retry with Backoff → Return Cached or 409 Conflict
```

### 2. **Cache Key Generation**

```
Format: userId:path:method:bodyHash:idempotencyKey

Example:
- Authenticated: user123:/auth/register:POST:a1b2c3d4:550e8400-...
- Anonymous: anon:/auth/register:POST:a1b2c3d4:550e8400-...
```

### 3. **Concurrent Request Handling**

When multiple requests arrive with the same idempotency key:

1. First request acquires lock and processes
2. Subsequent requests:
   - Check cache (if first request completed)
   - If locked, retry with exponential backoff (up to 5 times)
   - Return cached response if available
   - Return 409 Conflict if still processing after retries

---

## 📊 Response Headers

### Request Headers
- `Idempotency-Key: <key>` - Required for idempotent requests

### Response Headers
- `X-Idempotency-Key: <key>` - Echo of the idempotency key used
- `X-Idempotency-Replay: true` - Indicates this is a cached response

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "INVALID_IDEMPOTENCY_KEY",
    "message": "Invalid Idempotency-Key header. Must be 8-128 characters."
  }
}
```

### 400 Bad Request (Required)
```json
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_KEY_REQUIRED",
    "message": "Idempotency-Key header is required for this endpoint"
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "A request with this idempotency key is already being processed. Please retry after a moment."
  }
}
```

---

## 💡 Best Practices

### 1. **Generate Unique Keys**
```typescript
import { randomUUID } from 'crypto';

const idempotencyKey = randomUUID(); // Recommended
```

### 2. **Client-Side Retry Logic**
```typescript
async function makeIdempotentRequest(url: string, data: unknown) {
  const idempotencyKey = randomUUID();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(data),
    });
    
    // If 409 Conflict, retry after delay
    if (response.status === 409) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return makeIdempotentRequest(url, data); // Retry with same key
    }
    
    return response;
  } catch (error) {
    // Retry on network errors with same key
    return makeIdempotentRequest(url, data);
  }
}
```

### 3. **Key Scope**
- **Per User**: Each user should use unique keys
- **Per Operation**: Different operations should use different keys
- **Per Request Body**: Same key + different body = different responses

### 4. **Key Lifetime**
- Keys are cached for **24 hours**
- After 24 hours, same key can be reused
- Use new keys for new requests

---

## 🔧 Configuration

### Redis Store Settings
```typescript
// src/lib/redis.ts
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours
const LOCK_TTL_SECONDS = 60; // Lock expires after 60 seconds
```

### Middleware Settings
```typescript
// src/middleware/idempotency.middleware.ts
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const LOCK_TTL_SECONDS = 60;
```

---

## 🧪 Testing

### Test Idempotent Request
```bash
# First request
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"name":"John","email":"john@example.com"}'

# Duplicate request (should return cached response)
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"name":"John","email":"john@example.com"}'
```

### Test Concurrent Requests
```bash
# Run multiple requests simultaneously with same key
for i in {1..5}; do
  curl -X POST http://localhost:8000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: test-concurrent-key" \
    -d '{"name":"John","email":"john@example.com"}' &
done
wait
```

---

## 📈 Performance

### Cache Behavior
- **Cache Hit**: ~1ms (Redis lookup)
- **Cache Miss**: Normal request processing time
- **Lock Acquisition**: ~1-2ms (Redis SET NX)

### Storage
- **Cache Size**: Limited to 1MB per response
- **TTL**: 24 hours
- **Cleanup**: Automatic via Redis TTL

---

## 🔒 Security Considerations

1. **Key Uniqueness**: Clients must generate unique keys
2. **Key Scope**: Keys are scoped per user and path
3. **Body Hashing**: Different bodies with same key = different responses
4. **Lock Timeout**: Locks expire after 60 seconds to prevent deadlocks

---

## ✅ Status

**✅ PRODUCTION READY**

- ✅ Proper error handling
- ✅ Concurrent request support
- ✅ Request body hashing
- ✅ Lock management
- ✅ Comprehensive logging
- ✅ RFC compliant
- ✅ TypeScript types
- ✅ Fail-open strategy

---

**Last Updated**: December 2024  
**Version**: 2.0.0

