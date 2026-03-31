# Admin Idempotency Key Management

## Overview

Idempotency keys are stored in **Redis** (not PostgreSQL) for performance and temporary storage. This document explains how to manage them manually.

## Why Redis?

- **Performance**: Fast lookups and writes
- **Temporary**: Keys expire after 24 hours automatically
- **Scalability**: Redis handles high concurrency better than PostgreSQL
- **Memory-based**: Perfect for temporary cache data

## Admin Endpoints

All endpoints require **Admin authentication** (`Authorization: Bearer <admin_token>`).

### 1. List All Idempotency Keys

**GET** `/api/v1/admin/idempotency`

Query Parameters:
- `limit` (optional): Number of keys to return (default: 100, max: 1000)

**Example:**
```bash
curl -X GET "http://localhost:5000/api/v1/admin/idempotency?limit=50" \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "keys": [
      "user123:/auth/register:POST:a1b2c3d4:550e8400-e29b-41d4-a716-446655440000",
      "user456:/subscription/purchase:POST:x9y8z7w6:660f9511-f39c-52e5-b827-557766551111"
    ],
    "count": 2
  }
}
```

### 2. Delete Specific Idempotency Key

**DELETE** `/api/v1/admin/idempotency?key=<idempotency_key>`

**Example:**
```bash
curl -X DELETE "http://localhost:5000/api/v1/admin/idempotency?key=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Idempotency key deleted successfully",
    "key": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 3. Delete All Idempotency Keys

**DELETE** `/api/v1/admin/idempotency`

⚠️ **Warning**: This deletes ALL idempotency keys. Use with caution!

**Example:**
```bash
curl -X DELETE "http://localhost:5000/api/v1/admin/idempotency" \
  -H "Authorization: Bearer <admin_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Deleted 42 idempotency key(s)",
    "deletedCount": 42
  }
}
```

## Using Redis CLI Directly

You can also manage keys directly using Redis CLI:

### List all idempotency keys:
```bash
redis-cli KEYS "idempotency:*"
```

### Delete specific key:
```bash
redis-cli DEL "idempotency:user123:/auth/register:POST:a1b2c3d4:550e8400-e29b-41d4-a716-446655440000"
redis-cli DEL "idempotency:lock:user123:/auth/register:POST:a1b2c3d4:550e8400-e29b-41d4-a716-446655440000"
```

### Delete all idempotency keys:
```bash
redis-cli --scan --pattern "idempotency:*" | xargs redis-cli DEL
```

### Count idempotency keys:
```bash
redis-cli --scan --pattern "idempotency:*" | wc -l
```

## Key Format

Idempotency keys are stored with the format:
```
idempotency:<userId>:<path>:<method>:<bodyHash>:<idempotencyKey>
```

Example:
```
idempotency:user123:/auth/register:POST:a1b2c3d4:550e8400-e29b-41d4-a716-446655440000
```

Locks are stored with:
```
idempotency:lock:<userId>:<path>:<method>:<bodyHash>:<idempotencyKey>
```

## Automatic Expiration

- Idempotency keys automatically expire after **24 hours**
- Locks expire after **60 seconds** (if not manually released)
- No manual cleanup needed for expired keys

## Troubleshooting

### Keys not showing in PostgreSQL
✅ **This is expected!** Idempotency keys are stored in Redis, not PostgreSQL.

### Cannot connect to Redis
- Check Redis is running: `redis-cli ping`
- Verify `REDIS_URL` in `.env`
- Check Redis logs for connection errors

### Admin endpoint returns 403
- Ensure you're using an admin token
- Check user role is `admin` in database

