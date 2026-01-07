# API Quick Reference Card

Quick reference for youruniverse.ai API endpoints and common operations.

---

## 🔑 Authentication

### Register
```bash
POST /api/v1/auth/register
Body: { name, username, email, password }
```

### Check Username Availability ⚡
```bash
GET /api/v1/auth/username/check?username=johndoe
Response: { available: true/false, suggestions?: [...] }
```

### Login
```bash
POST /api/v1/auth/login
Body: { email, password }
Response: { tokens: { accessToken, refreshToken } }
```

### Refresh Token
```bash
POST /api/v1/auth/refresh
Body: { refreshToken }
Response: { tokens: { accessToken, refreshToken } }
```

### Logout
```bash
POST /api/v1/auth/logout
Headers: Authorization: Bearer <token>
Body: { refreshToken }
```

---

## 👤 User Endpoints

### Get Current User
```bash
GET /api/v1/user/me
Headers: Authorization: Bearer <accessToken>
```

### Update Profile
```bash
PUT /api/v1/user/profile
Headers: Authorization: Bearer <accessToken>
Body: { name?, username?, aboutMe?, theme?, ... }
```

### Change Password
```bash
PUT /api/v1/user/change-password
Headers: Authorization: Bearer <accessToken>
Body: { oldPassword, newPassword, mfaCode? }
```

---

## 📝 Common Headers

```http
Content-Type: application/json
Authorization: Bearer <access_token>
Idempotency-Key: <unique-key>  # For POST/PUT/PATCH
```

---

## ⚡ Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "..."
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

---

## 🚦 Rate Limits

| Type | Limit | Window |
|------|-------|--------|
| General | 100 req | 1 min |
| Auth | 5 req | 1 min |
| Upload | 10 req | 1 min |

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1702896000
```

---

## 🔄 Idempotency

For POST/PUT/PATCH requests, include:
```http
Idempotency-Key: <unique-key>
```

Prevents duplicate operations. Use UUIDs or unique identifiers.

---

## ⚠️ Common Errors

| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | Invalid/missing token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Already exists |
| `VALIDATION_ERROR` | 422 | Invalid input |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |

---

## 🔧 cURL Examples

### Register
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","username":"john","email":"john@example.com","password":"Pass123"}'
```

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Pass123"}'
```

### Get Profile
```bash
curl -X GET http://localhost:8000/api/v1/user/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

---

## 📚 Full Documentation

See `API_USAGE_GUIDE.md` for complete documentation with examples.

---

**Base URL:** `http://localhost:8000/api/v1`  
**Health Check:** `GET /health`

