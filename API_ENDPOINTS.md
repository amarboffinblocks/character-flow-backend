# API Endpoints Documentation

Complete reference for all youruniverse.ai API endpoints.

---

## Authentication Endpoints

### 🔐 Two-Factor Authentication (2FA) Flow

The authentication system uses **Two-Factor Authentication (2FA)** with OTP (One-Time Password) for enhanced security:

**Login Process:**
1. **Step 1**: User provides identifier (phone/email/username) + password → System verifies credentials and sends 6-digit OTP
2. **Step 2**: User provides userId + OTP code → System verifies OTP and issues access/refresh tokens

**OTP Delivery:**
- If login with **phone number** → OTP sent via **SMS**
- If login with **email/username** → OTP sent via **email**
- If SMS fails → Automatically falls back to email

**Security Features:**
- OTP expires in 5 minutes
- Maximum 3 verification attempts per OTP
- Rate limiting: Can request new OTP after 60 seconds
- OTP is 6-digit numeric code
- Previous OTP invalidated when new one is requested

---

### 1. Register
- **Method:** `POST`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
- **Endpoint:** `/api/v1/auth/register`
- **Auth Required:** No
- **Headers:**
  - `Idempotency-Key: <unique_key>` (recommended - UUID recommended)
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "user@example.com",
  "phoneNumber": "+1234567890",  // Optional - E.164 format (e.g., +1234567890)
  "password": "Password123!"
}
```
- **Password Requirements:**
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
- **Username Requirements:**
  - Minimum 3 characters
  - Maximum 30 characters
  - Only letters, numbers, underscores, and hyphens
- **Phone Number Requirements:**
  - Optional field
  - Must be in E.164 format if provided (e.g., `+1234567890`)
  - Must start with `+` followed by country code
  - Must be unique if provided
- **Email Requirements:**
  - Required field
  - Must be a valid email address
  - Must be unique
- **Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "username": "johndoe",
      "email": "user@example.com",
      "phoneNumber": "+1234567890",
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "role": "user",
      "subscriptionPlan": "adventurer",
      "tokensRemaining": 0
    },
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```
- **Notes:**
  - Email is **required** for registration
  - Phone number is **optional** but recommended for 2FA
  - Email verification token is sent to registered email
  - Token expires in 24 hours
  - **Email verification is REQUIRED before login** - users must verify their email address before they can log in
  - Username must be unique
  - Phone number must be unique if provided
  - **Idempotency-Key recommended** - Prevents duplicate account creation on retries

---

### 2. Verify Email
- **Method:** `GET`
- **Endpoint:** `/api/v1/auth/verify`
- **Auth Required:** No
- **Query Parameters:**
  - `token` (required) - Email verification token
- **Example:** `/api/v1/auth/verify/email/verification_token_here`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully"
  }
}
```
- **Notes:**
  - Token is sent via email after registration
  - Token expires in 24 hours
  - After verification, `isEmailVerified` is set to `true`
  - If token expires, user can request a new verification email using the resend verification endpoint

---

### 2a. Resend Verification Email
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/resend-verification`
- **Auth Required:** No
- **Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Verification email sent. Please check your inbox."
  }
}
```
- **Error Responses:**
  - `400 Bad Request` - Email already verified:
  ```json
  {
    "success": false,
    "error": {
      "message": "Email is already verified"
    }
  }
  ```
  - `404 Not Found` - User not found (security: doesn't reveal if email exists):
  ```json
  {
    "success": false,
    "error": {
      "message": "If an account with this email exists, a verification email has been sent."
    }
  }
  ```
- **Notes:**
  - Use this endpoint if the verification token expired or was lost
  - Invalidates any existing unused verification tokens
  - Generates a new verification token (expires in 24 hours)
  - Sends a new verification email
  - Returns the same message whether user exists or not (security best practice)

---

### 3. Login (Step 1: Request OTP)
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/login`
- **Auth Required:** No
- **Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "identifier": "+1234567890",  // Phone number (E.164), email, or username
  "password": "Password123!"
}
```
- **Identifier Options:**
  - **Phone Number**: `+1234567890` (E.164 format) - OTP sent via SMS
  - **Email**: `user@example.com` - OTP sent via email
  - **Username**: `johndoe` - OTP sent via email
- **Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "message": "Verification code sent to your phone. Please check and enter the 6-digit code.",
    "verificationMethod": "sms",  // "sms" | "email"
    "expiresAt": "2024-12-17T10:05:00.000Z"
  }
}
```
- **Notes:**
  - This is **Step 1** of the 2FA login process
  - Credentials are verified (identifier + password)
  - **Email verification is REQUIRED** - users with unverified emails will receive a 403 Forbidden error
  - OTP is generated and sent based on identifier type:
    - If login with **phone** → OTP sent via SMS
    - If login with **email/username** → OTP sent via email
  - Response includes `userId` - **save this** for Step 2
  - OTP expires in 5 minutes
  - OTP is 6 digits
  - Maximum 3 verification attempts per OTP
  - Rate limited: Can request new OTP after 60 seconds
  - After receiving OTP, proceed to **Step 2** (Verify OTP endpoint) with `userId` and OTP code
- **Error Responses:**
  - `403 Forbidden` - Email not verified:
  ```json
  {
    "success": false,
    "error": {
      "message": "Please verify your email address before logging in. Check your email for the verification link."
    }
  }
  ```

---

### 3a. Verify OTP (Step 2: Complete Login)
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/login/verify-otp`
- **Auth Required:** No
- **Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "userId": "user-uuid",  // User ID from Step 1 (should be returned in response)
  "code": "123456"  // 6-digit OTP code
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "username": "johndoe",
      "email": "user@example.com",
      "phoneNumber": "+1234567890",
      "role": "user",
      "subscriptionPlan": "explorer",
      "tokensRemaining": 5000,
      "isEmailVerified": true,
      "isPhoneVerified": true
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "refresh_token"
    }
  },
  "message": "Login successful"
}
```
- **Notes:**
  - This is **Step 2** of the 2FA login process
  - Use `userId` from Step 1 response
  - Enter the 6-digit OTP code received via SMS or email
  - OTP must be verified within 5 minutes
  - Maximum 3 attempts per OTP
  - After successful verification, tokens are issued
  - Access token expires in 15 minutes
  - Refresh token expires in 7 days
  - Store both tokens securely
  - Use access token for API requests
  - Use refresh token to get new access tokens
  - If OTP verification fails 3 times, use resend OTP endpoint to get a new code

---

### 3b. Resend OTP
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/login/resend-otp`
- **Auth Required:** No
- **Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "userId": "user-uuid"  // User ID from login Step 1
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "message": "Verification code sent to your email.",
    "verificationMethod": "email",  // "sms" | "email"
    "expiresAt": "2024-12-17T10:05:00.000Z"
  }
}
```
- **Notes:**
  - Can only resend OTP after 60 seconds (rate limit)
  - Previous OTP is invalidated when new one is sent
  - Delivery method preference: SMS if phone verified, otherwise email
  - If SMS fails, automatically falls back to email

---

### 3c. Check Username Availability
- **Method:** `GET`
- **Endpoint:** `/api/v1/auth/username/check`
- **Auth Required:** No
- **Headers:**
  - None required
- **Query Parameters:**
  - `username` (required) - Username to check availability
- **Example:** `/api/v1/auth/username/check?username=johndoe`
- **Response (Available):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "username": "johndoe"
  },
  "message": "Username is available"
}
```
- **Response (Taken):**
```json
{
  "success": true,
  "data": {
    "available": false,
    "username": "johndoe",
    "suggestions": [
      "johndoe123",
      "johndoe2024",
      "johndoe_user",
      "johndoe_456",
      "johndoe7890"
    ]
  },
  "message": "Username is already taken"
}
```
- **Response (Invalid Format):**
```json
{
  "success": true,
  "data": {
    "available": false,
    "username": "john@doe",
    "errors": [
      "Username can only contain letters, numbers, underscores, and hyphens",
      "Username must start with a letter"
    ]
  },
  "message": "Username format validation failed"
}
```
- **Username Requirements:**
  - Minimum 3 characters
  - Maximum 30 characters
  - Only letters, numbers, underscores, and hyphens
  - Must start with a letter
  - Cannot end with hyphen or underscore
  - Case-insensitive (automatically converted to lowercase)
  - Reserved usernames: `admin`, `root`, `test`, `support`, `api`, `auth`, `system`
- **Notes:**
  - **Instantaneous response** - Optimized with Redis caching (1 hour cache)
  - Perfect for real-time username validation as user types
  - Returns suggestions if username is taken
  - Rate limited: 30 requests per minute per IP
  - Results are cached for 1 hour for performance
  - Format validation happens before availability check
  - Username is automatically normalized (lowercase, trimmed)
  - Use this endpoint in registration forms for instant feedback

---

### 4. Refresh Token
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/refresh`
- **Auth Required:** No
- **Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "new_jwt_access_token",
      "refreshToken": "new_refresh_token"
    }
  },
  "message": "Token refreshed successfully"
}
```
- **Notes:**
  - Old refresh token becomes invalid immediately (token rotation)
  - Always use the new refresh token for subsequent refreshes
  - Access token expires in 15 minutes
  - Refresh token expires in 7 days
  - If refresh token is expired, user must login again

---

### 5. Logout
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/logout`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```
- **Notes:**
  - Revokes the refresh token
  - Access token remains valid until expiration
  - User must login again to get new tokens
  - All sessions are terminated

---

### 6. Forgot Password
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/forgot-password`
- **Auth Required:** No
- **Headers:**
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "email": "user@example.com"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists with this email, you will receive a password reset link."
  }
}
```
- **Notes:**
  - Always returns success message (prevents email enumeration)
  - Password reset token is sent via email
  - Token expires in 1 hour
  - If email doesn't exist, no email is sent but same message is returned

---

### 7. Reset Password
- **Method:** `PUT`
- **Endpoint:** `/api/v1/auth/reset-password`
- **Auth Required:** No
- **Headers:**
  - `Idempotency-Key: <unique_key>` (recommended - UUID recommended)
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "token": "password_reset_token_from_email",
  "password": "NewPassword123!"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully. Please login with your new password."
  }
}
```
- **Notes:**
  - Token expires in 1 hour
  - Token can only be used once
  - All existing sessions are invalidated
  - User must login again after password reset

---

## User Endpoints

### 8. Get Current User
- **Method:** `GET`
- **Endpoint:** `/api/v1/user/me`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "username": "johndoe",
      "email": "user@example.com",
      "phoneNumber": "+1234567890",
      "avatar": null,
      "backgroundImg": null,
      "role": "user",
      "isEmailVerified": true,
      "isPhoneVerified": true,
      "subscriptionPlan": "explorer",
      "tokensRemaining": 5000,
      "tokensUsed": 1500,
      "profileVisibility": "private",
      "profileRating": "SFW",
      "theme": "dark-purple",
      "fontStyle": "sans-serif",
      "fontSize": "16",
      "language": "en",
      "tagsToFollow": [],
      "tagsToAvoid": [],
      "aboutMe": "About me text",
      "following": [],
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "User profile retrieved successfully"
}
```
- **Notes:**
  - Returns complete user profile
  - Includes subscription and token information
  - Password is never included in response

---

### 9. Update Profile
- **Method:** `PUT`
- **Endpoint:** `/api/v1/user/profile`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "John Updated",
  "username": "newusername",
  "aboutMe": "Updated about me",
  "theme": "white",
  "fontStyle": "serif",
  "fontSize": "20",
  "language": "hi",
  "tagsToFollow": ["tag1", "tag2"],
  "tagsToAvoid": ["tag3"],
  "profileVisibility": "public",
  "profileRating": "SFW"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Updated",
      "username": "newusername",
      // ... other updated fields
    }
  },
  "message": "Profile updated successfully"
}
```
- **Notes:**
  - All fields are optional
  - Username must be unique if changed
  - Theme options: `"dark-purple"` | `"white"` | `"yellow"`
  - Font style options: `"serif"` | `"sans-serif"` | `"monospace"`
  - Font size options: `"12"` | `"16"` | `"20"`
  - Language options: `"en"` | `"hi"` | `"es"`
  - Profile visibility: `"public"` | `"private"`
  - Profile rating: `"SFW"` | `"NSFW"`

---

### 10. Update Profile Picture
- **Method:** `PUT`
- **Endpoint:** `/api/v1/user/profile-picture`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `avatar` file (image)
- **Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "avatar": {
        "url": "https://cdn.example.com/avatars/user-uuid.jpg",
        "width": 512,
        "height": 512
      }
    }
  },
  "message": "Profile picture updated successfully"
}
```
- **Notes:**
  - Supported formats: JPEG, PNG, WebP, GIF
  - Maximum file size: 10MB
  - Image is automatically resized and optimized
  - Old avatar is deleted when new one is uploaded

---

### 11. Change Password
- **Method:** `PUT`
- **Endpoint:** `/api/v1/user/change-password`
- **Auth Required:** Yes
- **MFA Required:** Yes (for sensitive operations)
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Idempotency-Key: <unique_key>` (recommended - UUID recommended)
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "mfaCode": "123456"  // Optional if MFA is enabled
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully. Please login again."
  }
}
```
- **Notes:**
  - Old password must be correct
  - New password must meet requirements
  - MFA code required if MFA is enabled
  - All sessions are invalidated after password change
  - User must login again

---

### 12. Delete Account
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/user/delete`
- **Auth Required:** Yes
- **MFA Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Idempotency-Key: <unique_key>` (recommended - UUID recommended)
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "password": "CurrentPassword123!",
  "mfaCode": "123456"  // Required if MFA is enabled
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Account deleted successfully"
  }
}
```
- **Notes:**
  - Requires password confirmation
  - Requires MFA code if MFA is enabled
  - Permanently deletes user account and all data
  - This action cannot be undone
  - All associated data (characters, personas, lorebooks, etc.) is deleted

---

## Subscription Endpoints

### 13. Get Subscription Plans
- **Method:** `GET`
- **Endpoint:** `/api/v1/subscription/plans`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "adventurer",
        "name": "Adventurer",
        "type": "free",
        "price": 0,
        "currency": "USD",
        "tokens": 1000,
        "features": ["Basic features", "Limited tokens"]
      },
      {
        "id": "explorer",
        "name": "Explorer",
        "type": "monthly",
        "price": 9.99,
        "currency": "USD",
        "tokens": 10000,
        "features": ["All basic features", "10K tokens/month"]
      },
      {
        "id": "voyager",
        "name": "Voyager",
        "type": "yearly",
        "price": 99.99,
        "currency": "USD",
        "tokens": 150000,
        "features": ["All features", "150K tokens/year", "Priority support"]
      },
      {
        "id": "pioneer",
        "name": "Pioneer",
        "type": "premium",
        "price": 29.99,
        "currency": "USD",
        "tokens": 50000,
        "features": ["All features", "50K tokens/month", "Priority support", "Custom models"]
      }
    ]
  }
}
```

---

### 14. Get Current Subscription
- **Method:** `GET`
- **Endpoint:** `/api/v1/subscription/me`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "id": "explorer",
      "name": "Explorer",
      "type": "monthly"
    },
    "status": "active",
    "startDate": "2024-12-01T00:00:00.000Z",
    "endDate": "2025-01-01T00:00:00.000Z",
    "autoRenew": true,
    "tokensRemaining": 7500,
    "tokensUsed": 2500,
    "totalTokens": 10000
  }
}
```

---

### 15. Purchase Subscription
- **Method:** `POST`
- **Endpoint:** `/api/v1/subscription/purchase`
- **Auth Required:** Yes
- **MFA Required:** Yes (for billing operations)
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Idempotency-Key: <unique_key>` (recommended - UUID recommended)
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "plan": "explorer",  // "explorer" | "voyager" | "pioneer"
  "paymentMethodId": "pm_1234567890",  // Payment method from payment provider
  "mfaCode": "123456"  // Required if MFA is enabled
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub-uuid",
      "plan": "explorer",
      "status": "active",
      "startDate": "2024-12-17T10:00:00.000Z",
      "endDate": "2025-01-17T10:00:00.000Z",
      "tokensAllocated": 10000,
      "tokensRemaining": 10000
    },
    "message": "Subscription purchased successfully"
  }
}
```

---

### 16. Upgrade Subscription
- **Method:** `POST`
- **Endpoint:** `/api/v1/subscription/upgrade`
- **Auth Required:** Yes
- **MFA Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Idempotency-Key: <unique_key>` (recommended - UUID recommended)
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "plan": "pioneer",
  "mfaCode": "123456"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "plan": "pioneer",
      "status": "active",
      "tokensAllocated": 50000,
      "tokensRemaining": 50000
    },
    "message": "Subscription upgraded successfully"
  }
}
```
- **Notes:**
  - Can only upgrade to higher tier
  - Tokens are added immediately
  - Prorated billing may apply

---

### 17. Downgrade Subscription
- **Method:** `POST`
- **Endpoint:** `/api/v1/subscription/downgrade`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "plan": "adventurer"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Downgrade scheduled for next billing cycle. You will retain benefits until then."
  }
}
```
- **Notes:**
  - Downgrade takes effect at next billing cycle
  - User retains current benefits until expiry
  - Immediate downgrade is not allowed (standard SaaS rule)

---

### 18. Cancel Subscription
- **Method:** `POST`
- **Endpoint:** `/api/v1/subscription/cancel`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Subscription cancelled. Auto-renewal disabled. You retain benefits until 2025-01-17."
  }
}
```
- **Notes:**
  - Cancels auto-renewal only
  - User retains benefits until expiry date
  - Can resume subscription before expiry

---

### 19. Resume Subscription
- **Method:** `POST`
- **Endpoint:** `/api/v1/subscription/resume`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Auto-renewal restored successfully"
  }
}
```

---

### 20. Buy Additional Tokens
- **Method:** `POST`
- **Endpoint:** `/api/v1/subscription/buy-tokens`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Idempotency-Key: <unique_key>` (recommended - UUID recommended)
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "tokenPack": "1000",  // Token pack size
  "paymentMethodId": "pm_1234567890"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "tokensPurchased": 1000,
    "tokensRemaining": 8500,
    "message": "Tokens purchased successfully"
  }
}
```

---

### 21. Get Token Transaction History
- **Method:** `GET`
- **Endpoint:** `/api/v1/subscription/tokens/history`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `page` (optional) - Page number (default: 1)
  - `limit` (optional) - Items per page (default: 20, max: 100)
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "txn-uuid",
      "type": "credit",
      "amount": 10000,
      "reason": "Subscription purchase - Explorer plan",
      "balanceAfter": 10000,
      "createdAt": "2024-12-17T10:00:00.000Z"
    },
    {
      "id": "txn-uuid-2",
      "type": "debit",
      "amount": 500,
      "reason": "Chat completion",
      "balanceAfter": 9500,
      "createdAt": "2024-12-17T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 22. Get Subscription History
- **Method:** `GET`
- **Endpoint:** `/api/v1/subscription/history`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `page` (optional) - Page number (default: 1)
  - `limit` (optional) - Items per page (default: 20)
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sub-hist-uuid",
      "plan": "explorer",
      "status": "active",
      "startDate": "2024-12-01T00:00:00.000Z",
      "endDate": "2025-01-01T00:00:00.000Z",
      "amount": 9.99,
      "currency": "USD",
      "paymentId": "pay_1234567890",
      "createdAt": "2024-12-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## Character Endpoints

### 23. Create Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data` (for file uploads) OR `application/json` (backward compatible)
- **Request Body (multipart/form-data):**
  - Form fields:
    - `characterName` (string, required) - Character name
    - `visiable` (string, optional) - "public" | "private" (default: "private")
    - `rating` (string, optional) - "SFW" | "NSFW" (default: "SFW")
    - `favourite` (boolean/string, optional) - Set to true to mark as favourite
    - `lorebook` (string, optional) - Lorebook slug
    - `persona` (string, optional) - Persona slug
    - `tags` (string/array, optional) - JSON string array or comma-separated
    - `description` (string, optional)
    - `scenario` (string, optional)
    - `personality` (string, optional) - Maps to `summary`
    - `firstMessage` (string, optional)
    - `alternateMessages` (string/array, optional) - JSON string array
    - `exampleDialogue` (string, optional) - Single dialogue (converted to array)
    - `authorNotes` (string, optional)
    - `characterNotes` (string, optional)
    - `authorName` (string, optional) - Name of the character author
      - For **public characters**: Can be set to "Anonymous" or the user's actual name (defaults to user's name if not provided)
      - For **private characters**: Always uses the user's actual name (anonymous option not available)
  - File fields:
    - `avatar` (file, optional) - Image file (JPEG, PNG, WebP, GIF, max 10MB)
    - `backgroundImage` (file, optional) - Image file (JPEG, PNG, WebP, GIF, max 10MB)
- **Image Storage:**
  - Images are automatically uploaded to **AWS S3** if configured (via environment variables)
  - If AWS S3 is not configured, images are stored locally in the `./uploads` directory
  - S3 configuration: Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, and `AWS_S3_BUCKET` environment variables
  - Optional: Set `AWS_S3_CDN_URL` for CDN access (e.g., CloudFront URL)
  - Images are optimized using Sharp before upload
  - Public URLs are returned in the response
- **Request Body (JSON - backward compatible):**
```json
{
  "name": "Character Name",
  "description": "Character description",
  "scenario": "Character scenario/lore setup",
  "summary": "Personality summary",
  "rating": "SFW",  // "SFW" | "NSFW"
  "visibility": "private",  // "public" | "private"
  "avatar": {
    "url": "https://cdn.example.com/characters/avatar.jpg",
    "width": 512,
    "height": 512
  },
  "backgroundImg": {
    "url": "https://cdn.example.com/characters/bg.jpg",
    "width": 1920,
    "height": 1080
  },
  "tags": ["tag1", "tag2"],
  "firstMessage": "Hello! How can I help you?",
  "alternateMessages": ["Hi there!", "Greetings!"],
  "exampleDialogues": ["User: Hello\nCharacter: Hi!"],
  "authorNotes": "Author notes",
  "characterNotes": "Character notes",
  "authorName": "Author Name",  // Optional - Name of the character author
                                // For public characters: Can be "Anonymous" or actual name (defaults to user's name)
                                // For private characters: Always uses user's actual name
  "personaId": "persona-uuid",  // Optional - UUID of persona
  "lorebookId": "lorebook-uuid",  // Optional - UUID of lorebook
  "realmId": "realm-uuid"  // Optional - UUID of realm
}
```
- **Field Mappings (Frontend → API):**
  - `characterName` → `name`
  - `visiable` → `visibility`
  - `personality` → `summary`
  - `exampleDialogue` → `exampleDialogues` (array)
  - `backgroundImage` → `backgroundImg`
  - `favourite` → `isFavourite` (note: this is set via toggle endpoint, not in create)
  - `lorebook` (slug) → `lorebookId` (UUID) - Frontend should resolve slug to UUID
  - `persona` (slug) → `personaId` (UUID) - Frontend should resolve slug to UUID
- **Field Requirements:**
  - `name`: Required, 1-100 characters
  - `description`: Optional, max 5000 characters
  - `scenario`: Optional, max 10000 characters
  - `summary`: Optional, max 2000 characters
  - `tags`: Optional array, max 20 tags, each tag 1-50 characters
  - `alternateMessages`: Optional array, max 10 messages, each max 5000 characters
  - `exampleDialogues`: Optional array, max 20 dialogues, each max 10000 characters
  - `firstMessage`: Optional, max 5000 characters
  - `authorNotes`: Optional, max 5000 characters
  - `characterNotes`: Optional, max 5000 characters
  - `authorName`: Optional, max 100 characters
    - For **public characters**: Can be set to "Anonymous" or the user's actual name (defaults to user's name if not provided)
    - For **private characters**: Always uses the user's actual name (anonymous option not available)
  - `avatar`: Optional JSON object (image metadata, e.g., `{"url": "...", "width": 512, "height": 512}`)
  - `backgroundImg`: Optional JSON object (image metadata, e.g., `{"url": "...", "width": 1920, "height": 1080}`)
  - `personaId`: Optional UUID string
  - `lorebookId`: Optional UUID string
  - `realmId`: Optional UUID string
- **Frontend Field Mapping:**
  - Frontend `characterName` → API `name`
  - Frontend `visiable` → API `visibility`
  - Frontend `personality` → API `summary`
  - Frontend `exampleDialogue` (string) → API `exampleDialogues` (array)
  - Frontend `backgroundImage` → API `backgroundImg`
  - Frontend `favourite` → Automatically handled during creation (set to `true` if provided)
  - Frontend `lorebook` (slug) → API `lorebookId` (UUID) - Frontend must resolve slug to UUID first
  - Frontend `persona` (slug) → API `personaId` (UUID) - Frontend must resolve slug to UUID first
- **Access Control:**
  - **Public characters** (`visibility: "public"`): Can be accessed by all users (authenticated and unauthenticated)
  - **Private characters** (`visibility: "private"`): Can only be accessed by the character creator (requires authentication)
- **Anonymous Author Name:**
  - For **public characters**: Users can choose to display their name or remain anonymous
    - Set `authorName` to `"Anonymous"` or leave it empty/null to remain anonymous
    - Set `authorName` to your actual name to display it publicly
    - If not provided, defaults to user's actual name
  - For **private characters**: Always displays the creator's actual name (anonymous option not available since only the creator can see it)
- **Image Upload:**
  - **Supported formats:** JPEG, PNG, WebP, GIF
  - **Max file size:** 10MB per file
  - **File fields:** `avatar` and `backgroundImage` (as file uploads in multipart/form-data)
  - Images are automatically processed, saved, and metadata (url, width, height) is generated
  - If files are uploaded, they take priority over JSON metadata in `avatar`/`backgroundImage` fields
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "name": "Character Name",
      "slug": "character-name-abc123",
      "description": "Character description",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "isSaved": false,
      "tags": ["tag1", "tag2"],
      "createdAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Character created successfully"
}
```
- **Notes:**
  - Character slug is automatically generated from name (e.g., "Character Name" → "character-name-abc123")
  - Slug is unique and SEO-friendly
  - Default `rating` is `"SFW"` if not provided
  - Default `visibility` is `"private"` if not provided
  - Default `tags`, `alternateMessages`, and `exampleDialogues` are empty arrays if not provided
  - Related entities (persona, lorebook, realm) must belong to the same user
  - Returns full character object with related entities populated
  - **Image Upload**: When using `multipart/form-data`, images are automatically processed and uploaded to AWS S3 (if configured) or stored locally
  - **Field Mapping**: Frontend field names are automatically mapped to API field names (e.g., `characterName` → `name`, `visiable` → `visibility`)
  - **Slug Resolution**: For `lorebook` and `persona` fields, provide slugs which will be resolved to UUIDs automatically
  - **Favourite Handling**: If `favourite` is set to `true` in the request, the character will be automatically marked as favourite after creation

---

### 24. List Characters
- **Method:** `GET`
- **Endpoint:** `/api/v1/characters`
- **Auth Required:** No (Optional - for personalized results)
- **Headers:**
  - `Authorization: Bearer <access_token>` (optional)
- **Query Parameters:**
  - `page` (optional) - Page number (default: 1)
  - `limit` (optional) - Items per page (default: 20, max: 100). Set to `0` to fetch all characters without pagination
  - `search` (optional) - Search in name/description
  - `rating` (optional) - Filter by rating: `"SFW"` | `"NSFW"`
  - `visibility` (optional) - Filter by visibility: `"public"` | `"private"` (only applies when authenticated)
  - `isFavourite` (optional) - Filter favourites: `true` | `false` (only applies when authenticated)
  - `isSaved` (optional) - Filter saved: `true` | `false` (only applies when authenticated)
  - `tags` (optional) - Filter by tags (comma-separated, e.g., `"tag1,tag2"`)
  - `sortBy` (optional) - Sort field: `"createdAt"` | `"updatedAt"` | `"name"` | `"chatCount"` (default: `"createdAt"`)
  - `sortOrder` (optional) - Sort order: `"asc"` | `"desc"` (default: `"desc"`)
- **Response:**
```json
{
  "success": true,
  "data": {
    "characters": [
    {
      "id": "character-uuid",
      "name": "Character Name",
      "slug": "character-name-abc123",
      "description": "Character description",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "isSaved": false,
      "tags": ["tag1", "tag2"],
      "chatCount": 5,
        "persona": {
          "id": "persona-uuid",
          "name": "Persona Name"
        },
        "lorebook": {
          "id": "lorebook-uuid",
          "name": "Lorebook Name"
        },
        "realm": {
          "id": "realm-uuid",
          "name": "Realm Name"
        },
        "createdAt": "2024-12-17T10:00:00.000Z",
        "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
      "totalPages": 3
  }
  },
  "message": "Characters retrieved successfully"
}
```
- **Notes:**
  - Pagination is enabled by default (limit=20 per page)
  - If **authenticated**: Returns user's own characters (private and public)
  - If **not authenticated**: Returns only public characters
  - Visibility, isFavourite, and isSaved filters only work when authenticated
  - Public characters include basic user info (id, username, avatar) for attribution
  - Set `limit=0` to fetch all matching characters in a single response (useful for "select all" functionality)

---

### 25. Get Character by ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/characters/:id`
- **Auth Required:** No (Optional - required for private character access)
- **Headers:**
  - `Authorization: Bearer <access_token>` (optional, but required to access private characters)
- **Access Control:**
  - **Public characters**: Can be accessed by anyone (with or without authentication)
  - **Private characters**: Can only be accessed by the character creator (authentication required)
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "name": "Character Name",
      "slug": "character-name-abc123",
      "description": "Character description",
      "scenario": "Character scenario",
      "summary": "Personality summary",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "isSaved": false,
      "avatar": {
        "url": "https://cdn.example.com/characters/avatar.jpg"
      },
      "backgroundImg": {
        "url": "https://cdn.example.com/characters/bg.jpg"
      },
      "tags": ["tag1", "tag2"],
      "firstMessage": "Hello!",
      "alternateMessages": ["Hi!", "Greetings!"],
      "exampleDialogues": ["..."],
      "authorNotes": "Author notes",
      "characterNotes": "Character notes",
      "authorName": "Author Name",
      "persona": {
        "id": "persona-uuid",
        "name": "Persona Name"
      },
      "lorebook": {
        "id": "lorebook-uuid",
        "name": "Lorebook Name"
      },
      "chatCount": 5,
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  }
}
```

---

### 26. Update Character
- **Method:** `PUT`
- **Endpoint:** `/api/v1/characters/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:** (All fields optional)
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "scenario": "Updated scenario",
  "summary": "Updated summary",
  "rating": "NSFW",
  "visibility": "public",
  "tags": ["newtag1", "newtag2"],
  "firstMessage": "Updated first message",
  "alternateMessages": ["Updated alt 1", "Updated alt 2"],
  "exampleDialogues": ["Updated dialogue"],
  "authorNotes": "Updated author notes",
  "characterNotes": "Updated character notes",
  "authorName": "Updated Author Name",  // Optional
                                        // For public characters: Can be "Anonymous" or actual name
                                        // For private characters: Always uses user's actual name
  "personaId": "persona-uuid",  // Optional, set to null to unlink
  "lorebookId": "lorebook-uuid",  // Optional, set to null to unlink
  "realmId": "realm-uuid",  // Optional, set to null to unlink
  "isFavourite": true,  // Optional
  "isSaved": true  // Optional
}
```
- **Notes:**
  - All fields are optional
  - Setting related entity IDs to `null` will unlink them
  - If `name` is updated, a new unique slug is automatically generated
  - Only the character owner can update their character
  - **Author Name Behavior:**
    - When changing from private to public: If `authorName` is not provided, defaults to "Anonymous" for privacy
    - When changing from public to private: `authorName` is automatically set to user's actual name
    - For public characters: Can be updated to "Anonymous" or actual name
    - For private characters: Always uses user's actual name (anonymous option ignored)
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "name": "Updated Name",
      "slug": "updated-name-xyz789",
      "description": "Updated description",
      "scenario": "Updated scenario",
      "summary": "Updated summary",
      "rating": "NSFW",
      "visibility": "public",
      "isFavourite": true,
      "isSaved": true,
      "tags": ["newtag1", "newtag2"],
      "firstMessage": "Updated first message",
      "alternateMessages": ["Updated alt 1", "Updated alt 2"],
      "exampleDialogues": ["Updated dialogue"],
      "authorNotes": "Updated author notes",
      "characterNotes": "Updated character notes",
      "authorName": "Updated Author Name",
      "persona": {
        "id": "persona-uuid",
        "name": "Persona Name"
      },
      "lorebook": {
        "id": "lorebook-uuid",
        "name": "Lorebook Name"
      },
      "realm": {
        "id": "realm-uuid",
        "name": "Realm Name"
      },
      "chatCount": 5,
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T11:00:00.000Z"
    }
  },
  "message": "Character updated successfully"
}
```

---

### 27. Delete Character
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/characters/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Character deleted successfully"
  },
    "message": "Character deleted successfully"
}
```
- **Notes:**
  - Only the character owner can delete their character
  - Associated chats are automatically handled (cascade delete)
  - This action cannot be undone

---

### 28. Toggle Favourite
- **Method:** `PATCH`
- **Endpoint:** `/api/v1/characters/:id/favourite`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "name": "Character Name",
    "isFavourite": true,
      // ... other character fields
  }
  },
  "message": "Character favourite status updated successfully"
}
```
- **Notes:**
  - Toggles the `isFavourite` status (true ↔ false)
  - Only the character owner can toggle favourite status
  - Returns the updated character object

---

### 29. Toggle Saved
- **Method:** `PATCH`
- **Endpoint:** `/api/v1/characters/:id/saved`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "name": "Character Name",
    "isSaved": true,
      // ... other character fields
  }
  },
  "message": "Character saved status updated successfully"
}
```
- **Notes:**
  - Toggles the `isSaved` status (true ↔ false)
  - Only the character owner can toggle saved status
  - Returns the updated character object

---

### 30. Upload Character Avatar
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/avatar`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `avatar` file (image)
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "avatar": {
        "url": "https://cdn.example.com/characters/avatar.jpg",
        "width": 512,
        "height": 512
      }
    }
  },
  "message": "Avatar uploaded successfully"
}
```

---

### 31. Upload Character Background
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/background`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `background` file (image)
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "backgroundImg": {
        "url": "https://cdn.example.com/characters/bg.jpg",
        "width": 1920,
        "height": 1080
      }
    }
  },
  "message": "Background uploaded successfully"
}
```

---

### 32. Duplicate Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/duplicate`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "new-character-uuid",
      "name": "Character Name (Copy)",
      "slug": "character-name-copy-xyz789"
      // ... all character data duplicated
    }
  },
  "message": "Character duplicated successfully"
}
```
- **Notes:**
  - Creates a duplicate of the character with "(Copy)" appended to the name
  - All character data is copied (description, scenario, avatar, tags, etc.)
  - New unique slug is automatically generated
  - Only the character owner can duplicate their character
  - Author name is preserved based on visibility (public characters keep their authorName, private characters use actual name)

---

### 32a. Batch Duplicate Characters
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/batch-duplicate`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "characterIds": ["char-id-1", "char-id-2", "char-id-3"]
}
```
- **Request Body Requirements:**
  - `characterIds`: Array of character UUIDs (required)
    - Minimum: 1 character ID
    - Maximum: 100 character IDs
    - All IDs must be valid UUIDs
- **Response:**
```json
{
  "success": true,
  "data": {
    "characters": [
      {
        "id": "new-char-id-1",
        "name": "Character Name (Copy)",
        "slug": "character-name-copy-abc123",
        // ... full character object
      },
      {
        "id": "new-char-id-2",
        "name": "Character Name 2 (Copy)",
        "slug": "character-name-2-copy-xyz789",
        // ... full character object
      }
    ],
    "message": "Successfully duplicated 2 character(s)"
  },
  "message": "Successfully duplicated 2 character(s)"
}
```
- **Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Character IDs array is required and cannot be empty"
  }
}
```
- **Notes:**
  - **Single API Call**: Duplicates multiple characters in one request instead of N separate requests
  - **Atomic Operation**: All characters are duplicated or none (if one fails, the operation fails)
  - **Ownership Verification**: All characters must belong to the authenticated user
  - **Character Validation**: All character IDs must exist and be valid
  - **Name Format**: Each duplicated character has "(Copy)" appended to its name
  - **Unique Slugs**: New unique slugs are automatically generated for each duplicate
  - **Author Name**: Preserved based on visibility (public characters keep their authorName, private characters use actual name)
  - **Performance**: Optimized for batch operations with reduced network overhead
  - **Maximum Limit**: Can duplicate up to 100 characters in a single request

---

### 33. Link Persona to Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/link/persona/:personaId`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "personaId": "persona-uuid",
      "persona": {
        "id": "persona-uuid",
        "name": "Persona Name"
      }
    }
  },
  "message": "Persona linked successfully"
}
```

---

### 34. Unlink Persona from Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/unlink/persona`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Persona unlinked successfully"
  }
}
```

---

### 35. Link Lorebook to Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/link/lorebook/:lorebookId`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "lorebookId": "lorebook-uuid",
      "lorebook": {
        "id": "lorebook-uuid",
        "name": "Lorebook Name"
      }
    }
  },
  "message": "Lorebook linked successfully"
}
```

---

### 36. Unlink Lorebook from Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/unlink/lorebook`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Lorebook unlinked successfully"
  }
}
```

---

### 37. Add Character to Realm/Folder
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/link/folder/:folderId`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "realmId": "realm-uuid",
      "realm": {
        "id": "realm-uuid",
        "name": "Realm Name"
      }
    }
  },
  "message": "Character added to realm successfully"
}
```

---

### 38. Export Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/export`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `format` (optional) - Export format: `"json"` | `"png"` (default: `"json"`)
- **Response:**
  - For JSON: Returns JSON file download
  - For PNG: Returns PNG image with embedded metadata
- **Notes:**
  - PNG export includes character data as metadata
  - JSON export includes all character fields

---

### 39. Import Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/import`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `file` (PNG or JSON)
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "name": "Imported Character",
      // ... imported character data
    }
  },
  "message": "Character imported successfully"
}
```

---

### 40. Bulk Import Characters
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/import/bulk`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `file` (ZIP containing PNG/JSON files)
- **Response:**
```json
{
  "success": true,
  "data": {
    "imported": 5,
    "failed": 0,
    "characters": [
      {
        "id": "character-uuid-1",
        "name": "Character 1"
      }
      // ... more characters
    ]
  },
  "message": "5 characters imported successfully"
}
```

---

### 41. Explore Public Characters
- **Method:** `GET`
- **Endpoint:** `/api/v1/characters/public`
- **Auth Required:** Yes (optional - for personalized results)
- **Headers:**
  - `Authorization: Bearer <access_token>` (optional)
- **Query Parameters:**
  - `page` (optional) - Page number (default: 1)
  - `limit` (optional) - Items per page (default: 20)
  - `search` (optional) - Search query
  - `rating` (optional) - Filter by rating
  - `tags` (optional) - Filter by tags
  - `sort` (optional) - Sort field
  - `order` (optional) - Sort order
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "character-uuid",
      "name": "Public Character",
      "slug": "public-character-abc123",
      "description": "Public character description",
      "rating": "SFW",
      "visibility": "public",
      "tags": ["public", "popular"],
      "chatCount": 100,
      "createdAt": "2024-12-17T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 42. Get Public Character by ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/characters/public/:id`
- **Auth Required:** No
- **Response:**
```json
{
  "success": true,
  "data": {
    "character": {
      "id": "character-uuid",
      "name": "Public Character",
      "description": "Public character description",
      "rating": "SFW",
      "visibility": "public",
      // ... character data (limited fields for public)
    }
  }
}
```
- **Notes:**
  - Only returns characters with `visibility: "public"`
  - Some fields may be limited for public access

---

## Persona Endpoints

### 43. Create Persona
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Persona Name",
  "description": "Persona description",
  "visibility": "private",  // "public" | "private"
  "rating": "SFW",  // "SFW" | "NSFW"
  "tags": ["tag1", "tag2"],
  "lorebookId": "lorebook-uuid"  // Optional
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "persona": {
      "id": "persona-uuid",
      "name": "Persona Name",
      "slug": "persona-name-abc123",
      "description": "Persona description",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "isSaved": false,
      "tags": ["tag1", "tag2"],
      "createdAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Persona created successfully"
}
```

---

### 44. List Personas
- **Method:** `GET`
- **Endpoint:** `/api/v1/personas`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:** (Same as characters list)
  - `page`, `limit`, `search`, `rating`, `visibility`, `isFavourite`, `isSaved`, `tags`, `sort`, `order`
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "persona-uuid",
      "name": "Persona Name",
      "slug": "persona-name-abc123",
      "description": "Persona description",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "isSaved": false,
      "tags": ["tag1", "tag2"],
      "createdAt": "2024-12-17T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 30,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 45. Get Persona by ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/personas/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "persona": {
      "id": "persona-uuid",
      "name": "Persona Name",
      "description": "Persona description",
      "rating": "SFW",
      "visibility": "private",
      "avatar": {
        "url": "https://cdn.example.com/personas/avatar.jpg"
      },
      "backgroundImg": {
        "url": "https://cdn.example.com/personas/bg.jpg"
      },
      "tags": ["tag1", "tag2"],
      "lorebook": {
        "id": "lorebook-uuid",
        "name": "Lorebook Name"
      },
      "characters": [
        {
          "id": "character-uuid",
          "name": "Character Name"
        }
      ],
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  }
}
```

---

### 46. Update Persona
- **Method:** `PUT`
- **Endpoint:** `/api/v1/personas/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:** (All fields optional)
```json
{
  "name": "Updated Persona Name",
  "description": "Updated description",
  "rating": "NSFW",
  "visibility": "public",
  "tags": ["newtag1", "newtag2"]
}
```

---

### 47. Delete Persona
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/personas/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `force` (optional) - Force delete even if linked to characters: `true` | `false` (default: `false`)
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Persona deleted successfully"
  }
}
```
- **Notes:**
  - Cannot delete if linked to characters (unless `force=true`)
  - Force delete will unlink from all characters

---

### 48. Toggle Persona Favourite
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/:id/favorite`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`

---

### 49. Toggle Persona Saved
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/:id/save`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`

---

### 50. Upload Persona Avatar
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/:id/avatar`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`

---

### 51. Duplicate Persona
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/:id/duplicate`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`

---

### 52. Import Persona
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/import`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`

---

### 53. Bulk Import Personas
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/import/bulk`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`

---

### 54. Export Persona
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/:id/export`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `format` (optional) - `"json"` | `"png"` (default: `"json"`)

---

## Lorebook Endpoints

### 55. Create Lorebook
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Lorebook Name",
  "description": "Lorebook description",
  "visibility": "private",  // "public" | "private"
  "rating": "SFW",  // "SFW" | "NSFW"
  "avatar": {
    "url": "https://cdn.example.com/lorebooks/avatar.jpg"
  },
  "tags": ["tag1", "tag2"],
  "entries": [
    {
      "keyword": "magic",
      "context": "Magic in this world is powered by crystals.",
      "priority": 1,
      "isEnabled": true
    },
    {
      "keyword": "kingdom",
      "context": "The Kingdom of Eldoria is ruled by mages.",
      "priority": 2,
      "isEnabled": true
    }
  ]
}
```
- **Field Requirements:**
  - `name`: Required, 1-100 characters
  - `description`: Optional, max 5000 characters
  - `tags`: Optional array, max 20 tags, each tag 1-50 characters
  - `entries`: Optional array, max 100 entries
  - `avatar`: Optional JSON object (image metadata)
  - Entry `keyword`: Required, 1-100 characters
  - Entry `context`: Required, 1-10000 characters
  - Entry `priority`: Optional, 0-100 (default: 0)
  - Entry `isEnabled`: Optional boolean (default: true)
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebook": {
      "id": "lorebook-uuid",
      "name": "Lorebook Name",
      "slug": "lorebook-name-abc123",
      "description": "Lorebook description",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "isSaved": false,
      "avatar": {
        "url": "https://cdn.example.com/lorebooks/avatar.jpg"
      },
      "tags": ["tag1", "tag2"],
      "entries": [
        {
          "id": "entry-uuid-1",
          "keyword": "magic",
          "context": "Magic in this world is powered by crystals.",
          "priority": 1,
          "isEnabled": true,
          "createdAt": "2024-12-17T10:00:00.000Z",
          "updatedAt": "2024-12-17T10:00:00.000Z"
        }
      ],
      "characters": [
        {
          "id": "character-uuid",
          "name": "Character Name"
        }
      ],
      "personas": [
        {
          "id": "persona-uuid",
          "name": "Persona Name"
        }
      ],
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Lorebook created successfully"
}
```
- **Notes:**
  - Lorebook slug is automatically generated from name (e.g., "Lorebook Name" → "lorebook-name-abc123")
  - Slug is unique and SEO-friendly
  - Default `rating` is `"SFW"` if not provided
  - Default `visibility` is `"private"` if not provided
  - Default `tags` and `entries` are empty arrays if not provided
  - Entries can be created during lorebook creation (max 100 entries)
  - Entries are ordered by priority (ascending), then by creation date
  - Returns full lorebook object with entries and related entities populated

---

### 56. List Lorebooks
- **Method:** `GET`
- **Endpoint:** `/api/v1/lorebooks`
- **Auth Required:** No (Optional - for personalized results)
- **Headers:**
  - `Authorization: Bearer <access_token>` (optional)
- **Query Parameters:**
  - `page` (optional) - Page number (default: 1)
  - `limit` (optional) - Items per page (default: 20, max: 100)
  - `search` (optional) - Search in name/description
  - `rating` (optional) - Filter by rating: `"SFW"` | `"NSFW"`
  - `visibility` (optional) - Filter by visibility: `"public"` | `"private"` (only applies when authenticated)
  - `isFavourite` (optional) - Filter favourites: `true` | `false` (only applies when authenticated)
  - `isSaved` (optional) - Filter saved: `true` | `false` (only applies when authenticated)
  - `tags` (optional) - Filter by tags (comma-separated, e.g., `"tag1,tag2"`)
  - `sortBy` (optional) - Sort field: `"createdAt"` | `"updatedAt"` | `"name"` (default: `"createdAt"`)
  - `sortOrder` (optional) - Sort order: `"asc"` | `"desc"` (default: `"desc"`)
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebooks": [
    {
      "id": "lorebook-uuid",
      "name": "Lorebook Name",
      "slug": "lorebook-name-abc123",
      "description": "Lorebook description",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "isSaved": false,
      "tags": ["tag1", "tag2"],
      "entriesCount": 5,
        "createdAt": "2024-12-17T10:00:00.000Z",
        "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
      "totalPages": 2
    }
  },
  "message": "Lorebooks retrieved successfully"
}
```
- **Notes:**
  - If **authenticated**: Returns user's own lorebooks (private and public)
  - If **not authenticated**: Returns only public lorebooks
  - Visibility, isFavourite, and isSaved filters only work when authenticated
  - Public lorebooks include basic user info (id, username, avatar) for attribution
  - `entriesCount` shows the number of entries in each lorebook

---

### 57. Get Lorebook by ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/lorebooks/:id`
- **Auth Required:** No (Optional - for private lorebook access)
- **Headers:**
  - `Authorization: Bearer <access_token>` (optional)
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebook": {
      "id": "lorebook-uuid",
      "name": "Lorebook Name",
      "description": "Lorebook description",
      "rating": "SFW",
      "visibility": "private",
      "avatar": {
        "url": "https://cdn.example.com/lorebooks/avatar.jpg"
      },
      "tags": ["tag1", "tag2"],
      "entries": [
        {
          "id": "entry-uuid",
          "keyword": "magic",
          "context": "Magic in this world is powered by crystals.",
          "priority": 1,
          "isEnabled": true,
          "createdAt": "2024-12-17T10:00:00.000Z"
        }
      ],
      "characters": [
        {
          "id": "character-uuid",
          "name": "Character Name"
        }
      ],
      "personas": [
        {
          "id": "persona-uuid",
          "name": "Persona Name"
        }
      ],
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Lorebook retrieved successfully"
}
```
- **Notes:**
  - If lorebook is **private** and user is not authenticated or not the owner: Returns `403 Forbidden`
  - If lorebook is **public**: Accessible without authentication
  - If authenticated and lorebook belongs to user: Full access to private lorebooks
  - Entries are ordered by priority (ascending), then by creation date

---

### 57a. Get Lorebook by Slug
- **Method:** `GET`
- **Endpoint:** `/api/v1/lorebooks/slug/:slug`
- **Auth Required:** No (Optional - for private lorebook access)
- **Headers:**
  - `Authorization: Bearer <access_token>` (optional)
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebook": {
      "id": "lorebook-uuid",
      "name": "Lorebook Name",
      "slug": "lorebook-name-abc123",
      "description": "Lorebook description",
      "rating": "SFW",
      "visibility": "private",
      "avatar": {
        "url": "https://cdn.example.com/lorebooks/avatar.jpg"
      },
      "tags": ["tag1", "tag2"],
      "entries": [
        {
          "id": "entry-uuid",
          "keyword": "magic",
          "context": "Magic in this world is powered by crystals.",
          "priority": 1,
          "isEnabled": true,
          "createdAt": "2024-12-17T10:00:00.000Z"
        }
      ],
      "characters": [
        {
          "id": "character-uuid",
          "name": "Character Name"
        }
      ],
      "personas": [
        {
          "id": "persona-uuid",
          "name": "Persona Name"
        }
      ],
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Lorebook retrieved successfully"
}
```
- **Notes:**
  - SEO-friendly endpoint using lorebook slug instead of ID
  - Same access rules as Get Lorebook by ID
  - Useful for public lorebook sharing via URLs

---

### 58. Update Lorebook
- **Method:** `PUT`
- **Endpoint:** `/api/v1/lorebooks/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:** (All fields optional)
```json
{
  "name": "Updated Lorebook Name",
  "description": "Updated description",
  "rating": "NSFW",
  "visibility": "public",
  "avatar": {
    "url": "https://cdn.example.com/lorebooks/avatar.jpg"
  },
  "tags": ["newtag1", "newtag2"],
  "isFavourite": true,
  "isSaved": true
}
```
- **Notes:**
  - All fields are optional
  - If `name` is updated, a new unique slug is automatically generated
  - Only the lorebook owner can update their lorebook
  - Note: Entries are managed separately via entry endpoints (see below)
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebook": {
      "id": "lorebook-uuid",
      "name": "Updated Lorebook Name",
      "slug": "updated-lorebook-name-xyz789",
      "description": "Updated description",
      "rating": "NSFW",
      "visibility": "public",
      "isFavourite": true,
      "isSaved": true,
  "tags": ["newtag1", "newtag2"],
  "entries": [
        // ... all entries (ordered by priority)
      ],
      "characters": [
        {
          "id": "character-uuid",
          "name": "Character Name"
        }
      ],
      "personas": [
        {
          "id": "persona-uuid",
          "name": "Persona Name"
        }
      ],
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T11:00:00.000Z"
    }
  },
  "message": "Lorebook updated successfully"
}
```

---

### 59. Delete Lorebook
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/lorebooks/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Lorebook deleted successfully"
  },
  "message": "Lorebook deleted successfully"
}
```
- **Notes:**
  - Only the lorebook owner can delete their lorebook
  - All entries are automatically deleted (cascade delete)
  - Characters and personas linked to this lorebook will have their `lorebookId` set to null
  - This action cannot be undone

---

### 60. Toggle Favourite
- **Method:** `PATCH`
- **Endpoint:** `/api/v1/lorebooks/:id/favourite`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebook": {
      "id": "lorebook-uuid",
      "name": "Lorebook Name",
      "isFavourite": true,
      // ... other lorebook fields
    }
  },
  "message": "Lorebook favourite status updated successfully"
}
```
- **Notes:**
  - Toggles the `isFavourite` status (true ↔ false)
  - Only the lorebook owner can toggle favourite status
  - Returns the updated lorebook object

---

### 61. Toggle Saved
- **Method:** `PATCH`
- **Endpoint:** `/api/v1/lorebooks/:id/saved`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebook": {
      "id": "lorebook-uuid",
      "name": "Lorebook Name",
      "isSaved": true,
      // ... other lorebook fields
    }
  },
  "message": "Lorebook saved status updated successfully"
}
```
- **Notes:**
  - Toggles the `isSaved` status (true ↔ false)
  - Only the lorebook owner can toggle saved status
  - Returns the updated lorebook object

---

### 62. List Lorebook Entries
- **Method:** `GET`
- **Endpoint:** `/api/v1/lorebooks/:id/entries`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `page` (optional) - Page number (default: 1)
  - `limit` (optional) - Items per page (default: 50, max: 100)
- **Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "entry-uuid",
        "keyword": "magic",
        "context": "Magic in this world is powered by crystals.",
        "priority": 1,
        "isEnabled": true,
        "createdAt": "2024-12-17T10:00:00.000Z",
        "updatedAt": "2024-12-17T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25,
      "totalPages": 1
    }
  },
  "message": "Entries retrieved successfully"
}
```
- **Notes:**
  - Only the lorebook owner can view entries
  - Entries are ordered by priority (ascending), then by creation date
  - Use this endpoint to manage entries separately from the lorebook

---

### 63. Create Lorebook Entry
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/:id/entries`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "keyword": "magic",
  "context": "Magic in this world is powered by crystals.",
  "priority": 1,
  "isEnabled": true
}
```
- **Field Requirements:**
  - `keyword`: Required, 1-100 characters
  - `context`: Required, 1-10000 characters
  - `priority`: Optional, 0-100 (default: 0)
  - `isEnabled`: Optional boolean (default: true)
- **Response:**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "entry-uuid",
      "lorebookId": "lorebook-uuid",
      "keyword": "magic",
      "context": "Magic in this world is powered by crystals.",
      "priority": 1,
      "isEnabled": true,
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Entry created successfully"
}
```
- **Notes:**
  - Only the lorebook owner can add entries
  - Entries are automatically ordered by priority when retrieved

---

### 64. Update Lorebook Entry
- **Method:** `PUT`
- **Endpoint:** `/api/v1/lorebooks/:id/entries/:entryId`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:** (All fields optional)
```json
{
  "keyword": "updated-keyword",
  "context": "Updated context",
  "priority": 2,
  "isEnabled": false
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "entry": {
      "id": "entry-uuid",
      "keyword": "updated-keyword",
      "context": "Updated context",
      "priority": 2,
      "isEnabled": false,
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T11:00:00.000Z"
    }
  },
  "message": "Entry updated successfully"
}
```
- **Notes:**
  - Only the lorebook owner can update entries
  - All fields are optional

---

### 65. Delete Lorebook Entry
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/lorebooks/:id/entries/:entryId`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Entry deleted successfully"
  },
  "message": "Entry deleted successfully"
}
```
- **Notes:**
  - Only the lorebook owner can delete entries
  - This action cannot be undone

---

### 66. Upload Lorebook Avatar
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/:id/avatar`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `avatar` file (image)
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebook": {
      "id": "lorebook-uuid",
      "avatar": {
        "url": "https://cdn.example.com/lorebooks/avatar.jpg",
        "width": 512,
        "height": 512
      }
    }
  },
  "message": "Avatar uploaded successfully"
}
```
- **Notes:**
  - Supported formats: JPEG, PNG, WebP, GIF
  - Maximum file size: 10MB
  - Image is automatically resized and optimized
  - Old avatar is deleted when new one is uploaded

---

### 67. Duplicate Lorebook
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/:id/duplicate`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebook": {
      "id": "new-lorebook-uuid",
      "name": "Lorebook Name (Copy)",
      "slug": "lorebook-name-copy-xyz789",
      // ... all lorebook data duplicated including entries
    }
  },
  "message": "Lorebook duplicated successfully"
}
```
- **Notes:**
  - Creates a copy of the lorebook with all entries
  - New slug is automatically generated
  - Only the lorebook owner can duplicate their lorebook

---

### 68. Import Lorebook
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/import`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `file` (PNG or JSON)
- **Response:**
```json
{
  "success": true,
  "data": {
    "lorebook": {
      "id": "lorebook-uuid",
      "name": "Imported Lorebook",
      // ... imported lorebook data including entries
    }
  },
  "message": "Lorebook imported successfully"
}
```
- **Notes:**
  - PNG export includes lorebook data as metadata
  - JSON export includes all lorebook fields and entries

---

### 69. Bulk Import Lorebooks
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/import/bulk`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `file` (ZIP containing PNG/JSON files)
- **Response:**
```json
{
  "success": true,
  "data": {
    "imported": 5,
    "failed": 0,
    "lorebooks": [
      {
        "id": "lorebook-uuid-1",
        "name": "Lorebook 1"
      }
      // ... more lorebooks
    ]
  },
  "message": "5 lorebooks imported successfully"
}
```

---

### 70. Export Lorebook
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/:id/export`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `format` (optional) - `"json"` | `"png"` (default: `"json"`)
- **Response:**
  - For JSON: Returns JSON file download with all lorebook data and entries
  - For PNG: Returns PNG image with embedded metadata
- **Notes:**
  - PNG export includes lorebook data as metadata
  - JSON export includes all lorebook fields and entries
  - Only the lorebook owner can export their lorebook

---

## Realm Endpoints

### 67. Create Realm
- **Method:** `POST`
- **Endpoint:** `/api/v1/realms`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Realm Name",
  "description": "Realm description",
  "tags": ["tag1", "tag2"],
  "rating": "SFW",  // "SFW" | "NSFW"
  "visibility": "private"  // "public" | "private"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "realm": {
      "id": "realm-uuid",
      "name": "Realm Name",
      "slug": "realm-name-abc123",
      "description": "Realm description",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "tags": ["tag1", "tag2"],
      "charactersCount": 0,
      "createdAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Realm created successfully"
}
```

---

### 68. List Realms
- **Method:** `GET`
- **Endpoint:** `/api/v1/realms`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `page`, `limit`, `search`, `rating`, `visibility`, `isFavourite`, `tags`, `sort`, `order`
  - `visibility` filter: `"all"` | `"public"` | `"private"` | `"saved"` | `"favourite"`
  - `sort`: `"alpha"` | `"date"` | `"rating"`
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "realm-uuid",
      "name": "Realm Name",
      "slug": "realm-name-abc123",
      "description": "Realm description",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "tags": ["tag1", "tag2"],
      "charactersCount": 5,
      "createdAt": "2024-12-17T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### 69. Get Realm by ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/realms/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "realm": {
      "id": "realm-uuid",
      "name": "Realm Name",
      "description": "Realm description",
      "rating": "SFW",
      "visibility": "private",
      "isFavourite": false,
      "avatar": {
        "url": "https://cdn.example.com/realms/avatar.jpg"
      },
      "tags": ["tag1", "tag2"],
      "characters": [
        {
          "id": "character-uuid",
          "name": "Character Name",
          "slug": "character-name-abc123"
        }
      ],
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  }
}
```

---

### 70. Update Realm
- **Method:** `PUT`
- **Endpoint:** `/api/v1/realms/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:** (All fields optional)
```json
{
  "name": "Updated Realm Name",
  "description": "Updated description",
  "rating": "NSFW",
  "visibility": "public",
  "tags": ["newtag1", "newtag2"]
}
```

---

### 71. Delete Realm
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/realms/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `force` (optional) - Force delete even if characters linked: `true` | `false` (default: `false`)
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Realm deleted successfully"
  }
}
```
- **Notes:**
  - Cannot delete if characters are linked (unless `force=true`)
  - Force delete will remove characters from realm

---

### 72. Toggle Realm Favourite
- **Method:** `POST`
- **Endpoint:** `/api/v1/realms/:id/favourite`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`

---

### 73. Duplicate Realm
- **Method:** `POST`
- **Endpoint:** `/api/v1/realms/:id/duplicate`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "realm": {
      "id": "new-realm-uuid",
      "name": "Realm Name (Copy)",
      "characters": [
        // Duplicated characters structure (not chats)
      ]
    }
  },
  "message": "Realm duplicated successfully"
}
```
- **Notes:**
  - Copies realm and characters structure
  - Does NOT copy chat history

---

### 74. Add Character to Realm
- **Method:** `POST`
- **Endpoint:** `/api/v1/realms/:id/characters`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "characterId": "character-uuid"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "realm": {
      "id": "realm-uuid",
      "characters": [
        {
          "id": "character-uuid",
          "name": "Character Name"
        }
      ]
    }
  },
  "message": "Character added to realm successfully"
}
```

---

### 75. Remove Character from Realm
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/realms/:id/characters/:charId`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Character removed from realm successfully"
  }
}
```

---

### 76. Upload Realm Avatar
- **Method:** `POST`
- **Endpoint:** `/api/v1/realms/:id/avatar`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`

---

### 77. Get Shareable Link
- **Method:** `GET`
- **Endpoint:** `/api/v1/realms/:id/share`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "shareLink": "https://youruniverse.ai/share/realm/abc123",
    "expiresAt": "2025-12-17T10:00:00.000Z"
  }
}
```

---

### 78. Export Realm
- **Method:** `POST`
- **Endpoint:** `/api/v1/realms/:id/export`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
  - Returns JSON file download with realm and characters data

---

### 79. Import Realm
- **Method:** `POST`
- **Endpoint:** `/api/v1/realms/import`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `file` (JSON)

---

### 80. Bulk Import Realms
- **Method:** `POST`
- **Endpoint:** `/api/v1/realms/import/bulk`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `file` (ZIP containing JSON files)

---

## Background Endpoints

### 81. Upload Background
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `image` file
  - Form data with optional `name`, `description`, `tags`, `rating`
- **Response:**
```json
{
  "success": true,
  "data": {
    "background": {
      "id": "background-uuid",
      "name": "Background Name",
      "description": "Background description",
      "image": {
        "url": "https://cdn.example.com/backgrounds/bg.jpg",
        "width": 1920,
        "height": 1080
      },
      "tags": ["tag1", "tag2"],
      "rating": "SFW",
      "isGlobalDefault": false,
      "isShared": false,
      "createdAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Background uploaded successfully"
}
```

---

### 82. List Backgrounds
- **Method:** `GET`
- **Endpoint:** `/api/v1/backgrounds`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Query Parameters:**
  - `page`, `limit`
  - `search` - Search in name/description
  - `tags` - Filter by tags (comma-separated)
  - `excludeTags` - Exclude tags (comma-separated)
  - `rating` - Filter by rating: `"SFW"` | `"NSFW"`
  - `linkedTo` - Filter by linked entity: `"character"` | `"persona"` | `"realm"`
  - `sort` - Sort field: `"date"` | `"name"` (default: `"date"`)
  - `order` - Sort order: `"asc"` | `"desc"` (default: `"desc"`)

---

### 83. Get Background by ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/backgrounds/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`

---

### 84. Update Background
- **Method:** `PUT`
- **Endpoint:** `/api/v1/backgrounds/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Updated Background Name",
  "description": "Updated description",
  "tags": ["newtag1", "newtag2"],
  "rating": "NSFW"
}
```

---

### 85. Delete Background
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/backgrounds/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`

---

### 86. Set Global Default Background
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/:id/default`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Background set as global default"
  }
}
```

---

### 87. Download Background
- **Method:** `GET`
- **Endpoint:** `/api/v1/backgrounds/:id/download`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
  - Returns original image file download

---

### 88. Duplicate Background
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/:id/duplicate`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`

---

### 89. Generate Shareable Link
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/:id/share`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`

---

### 90. Export Background
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/:id/export`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
  - Returns JSON file with metadata and image data

---

### 91. Link Background to Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/:id/link/character`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "characterId": "character-uuid"
}
```

---

### 92. Link Background to Persona
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/:id/link/persona`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "personaId": "persona-uuid"
}
```

---

### 93. Link Background to Realm
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/:id/link/realm`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "realmId": "realm-uuid"
}
```

---

### 94. Unlink Background
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/:id/unlink`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "All associations removed"
  }
}
```

---

### 95. Import Background
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/import`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`

---

### 96. Bulk Import Backgrounds
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/import/bulk`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: multipart/form-data`
- **Request Body:**
  - Form data with `file` (ZIP containing image files)

---

### 97. Bulk Export Backgrounds
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/export`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "ids": ["background-uuid-1", "background-uuid-2"]
}
```
- **Response:**
  - Returns ZIP file with JSON metadata files

---

### 98. Bulk Link Backgrounds to Account
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/link/account`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "ids": ["background-uuid-1", "background-uuid-2"]
}
```

---

### 99. Bulk Set Default Backgrounds
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/default/bulk`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "id": "background-uuid"
}
```

---

### 100. Bulk Delete Backgrounds
- **Method:** `POST`
- **Endpoint:** `/api/v1/backgrounds/delete/bulk`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "ids": ["background-uuid-1", "background-uuid-2"]
}
```

---

## Admin Endpoints

### 101. Update Subscription Plan (Admin)
- **Method:** `GET` (Note: Should be PUT/PATCH)
- **Endpoint:** `/api/v1/admin/subscription/plan`
- **Auth Required:** Yes (Admin only)
- **Headers:**
  - `Authorization: Bearer <admin_access_token>`
- **Request Body:**
```json
{
  "planId": "explorer",
  "price": 9.99,
  "currency": "USD",
  "tokens": 10000,
  "description": "Updated plan description"
}
```

---

### 102. List All Subscribers (Admin)
- **Method:** `GET`
- **Endpoint:** `/api/v1/admin/subscription/users`
- **Auth Required:** Yes (Admin only)
- **Headers:**
  - `Authorization: Bearer <admin_access_token>`
- **Query Parameters:**
  - `page`, `limit`
  - `plan` - Filter by plan
  - `status` - Filter by status: `"active"` | `"cancelled"` | `"expired"`
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "userId": "user-uuid",
      "email": "user@example.com",
      "plan": "explorer",
      "status": "active",
      "expiryDate": "2025-01-17T00:00:00.000Z",
      "tokensRemaining": 7500,
      "billingStatus": "paid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Webhook Endpoints

### 103. Subscription Webhook
- **Method:** `POST`
- **Endpoint:** `/api/v1/subscription/webhook`
- **Auth Required:** No (Uses webhook signature verification)
- **Headers:**
  - `X-Webhook-Signature: <signature>` (for verification)
  - `Content-Type: application/json`
- **Request Body:** (Varies by event type)
```json
{
  "event": "payment.success",  // "payment.success" | "payment.failure" | "auto_renew" | "refund"
  "subscriptionId": "sub-uuid",
  "userId": "user-uuid",
  "amount": 9.99,
  "currency": "USD",
  "timestamp": "2024-12-17T10:00:00.000Z"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Webhook processed successfully"
  }
}
```
- **Notes:**
  - Handles payment success, failure, auto-renewal, and refunds
  - Must verify webhook signature for security
  - Idempotent - same event can be processed multiple times safely

---

## Tags Endpoints

### 83. List Tags
- **Method:** `GET`
- **Endpoint:** `/api/v1/tags`
- **Auth Required:** No (optional - for personalized results)
- **Headers:**
  - `Authorization: Bearer <access_token>` (optional)
- **Query Parameters:**
  - `page` (optional) - Page number (default: 1)
  - `limit` (optional) - Items per page (default: 20, max: 100)
  - `search` (optional) - Search tags by name
  - `category` (optional) - Filter by category: `SFW` or `NSFW`
  - `sortBy` (optional) - Sort field: `name`, `usageCount`, `createdAt` (default: `name`)
  - `sortOrder` (optional) - Sort order: `asc` or `desc` (default: `asc`)
- **Response:**
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "tag-uuid",
        "name": "fantasy",
        "category": "SFW",
        "description": "Fantasy-themed content",
        "usageCount": 150,
        "createdAt": "2024-12-17T10:00:00.000Z",
        "updatedAt": "2024-12-17T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    }
  },
  "message": "Tags retrieved successfully"
}
```
- **Notes:**
  - Tag names are normalized to lowercase
  - Search is case-insensitive
  - Tags can be filtered by category (SFW or NSFW)
  - Usage count tracks how many times the tag is used across all entities

---

### 84. Create Tag
- **Method:** `POST`
- **Endpoint:** `/api/v1/tags`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "fantasy",
  "category": "SFW",
  "description": "Fantasy-themed content (optional)"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "tag": {
      "id": "tag-uuid",
      "name": "fantasy",
      "category": "SFW",
      "description": "Fantasy-themed content",
      "usageCount": 0,
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Tag created successfully"
}
```
- **Notes:**
  - Tag name must be unique (case-insensitive)
  - Tag name is automatically normalized to lowercase
  - Category must be either `SFW` or `NSFW`
  - Description is optional (max 500 characters)
  - Returns `409 Conflict` if tag with same name already exists

---

### 85. Get Tag by ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/tags/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "tag": {
      "id": "tag-uuid",
      "name": "fantasy",
      "category": "SFW",
      "description": "Fantasy-themed content",
      "usageCount": 150,
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T10:00:00.000Z"
    }
  },
  "message": "Tag retrieved successfully"
}
```
- **Notes:**
  - Returns `404 Not Found` if tag doesn't exist

---

### 86. Update Tag
- **Method:** `PUT`
- **Endpoint:** `/api/v1/tags/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "fantasy-updated",
  "category": "NSFW",
  "description": "Updated description"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "tag": {
      "id": "tag-uuid",
      "name": "fantasy-updated",
      "category": "NSFW",
      "description": "Updated description",
      "usageCount": 150,
      "createdAt": "2024-12-17T10:00:00.000Z",
      "updatedAt": "2024-12-17T11:00:00.000Z"
    }
  },
  "message": "Tag updated successfully"
}
```
- **Notes:**
  - All fields are optional
  - If updating name, new name must be unique
  - Returns `409 Conflict` if new name already exists
  - Returns `404 Not Found` if tag doesn't exist

---

### 87. Delete Tag
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/tags/:id`
- **Auth Required:** Yes
- **Headers:**
  - `Authorization: Bearer <access_token>`
- **Response:**
```json
{
  "success": true,
  "data": {
    "message": "Tag deleted successfully"
  },
  "message": "Tag deleted successfully"
}
```
- **Notes:**
  - Only the tag owner can delete tags
  - Cannot delete tags that are in use (`usageCount > 0`)
  - Returns `400 Bad Request` if tag is in use
  - Returns `404 Not Found` if tag doesn't exist
  - This action cannot be undone

---

### 88. Get Popular Tags
- **Method:** `GET`
- **Endpoint:** `/api/v1/tags/popular`
- **Auth Required:** No (optional - for personalized results)
- **Headers:**
  - `Authorization: Bearer <access_token>` (optional)
- **Query Parameters:**
  - `limit` (optional) - Number of tags to return (default: 10, max: 100)
  - `category` (optional) - Filter by category: `SFW` or `NSFW`
- **Response:**
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "tag-uuid-1",
        "name": "fantasy",
        "category": "SFW",
        "description": "Fantasy-themed content",
        "usageCount": 500,
        "createdAt": "2024-12-17T10:00:00.000Z",
        "updatedAt": "2024-12-17T10:00:00.000Z"
      },
      {
        "id": "tag-uuid-2",
        "name": "adventure",
        "category": "SFW",
        "description": "Adventure-themed content",
        "usageCount": 450,
        "createdAt": "2024-12-17T10:00:00.000Z",
        "updatedAt": "2024-12-17T10:00:00.000Z"
      }
    ]
  },
  "message": "Popular tags retrieved successfully"
}
```
- **Notes:**
  - Returns tags sorted by usage count (descending)
  - Can be filtered by category (SFW or NSFW)
  - Useful for tag suggestions and trending tags
  - Default limit is 10 tags

---

## Model Endpoints

### 106. List All Models
- **Method:** `GET`
- **Endpoint:** `/api/v1/models`
- **Auth Required:** No
- **Query Parameters:**
  - `isActive` (optional): Filter by active status. Accepts `"true"`, `"false"`, `"1"`, or `"0"` as strings.
- **Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "2ce1e3e8-cf21-4123-ae90-5058ad94268b",
        "name": "GPT-4o Mini",
        "slug": "gpt-4o-mini",
        "description": "OpenAI GPT-4o Mini model",
        "provider": "openai",
        "modelName": "gpt-4o-mini",
        "isActive": true,
        "isDefault": false,
        "metadata": null,
        "createdAt": "2026-02-05T12:55:27.391Z",
        "updatedAt": "2026-02-05T12:55:27.391Z"
      }
    ]
  },
  "message": "Models retrieved successfully"
}
```
- **Notes:**
  - Public endpoint - no authentication required
  - Returns all available AI models
  - Can filter by active status using `isActive` query parameter
  - Models are sorted by default status (default first) then alphabetically by name
  - Supported providers: `openai`, `gemini`, `aws`, `anthropic`, `local`

---

### 107. Get Model by ID
- **Method:** `GET`
- **Endpoint:** `/api/v1/models/{id}`
- **Auth Required:** No
- **Path Parameters:**
  - `id` (required): Model UUID
- **Response:**
```json
{
  "success": true,
  "data": {
    "model": {
      "id": "2ce1e3e8-cf21-4123-ae90-5058ad94268b",
      "name": "GPT-4o Mini",
      "slug": "gpt-4o-mini",
      "description": "OpenAI GPT-4o Mini model",
      "provider": "openai",
      "modelName": "gpt-4o-mini",
      "isActive": true,
      "isDefault": false,
      "metadata": null,
      "createdAt": "2026-02-05T12:55:27.391Z",
      "updatedAt": "2026-02-05T12:55:27.391Z"
    }
  },
  "message": "Model retrieved successfully"
}
```
- **Notes:**
  - Public endpoint - no authentication required
  - Returns detailed information about a specific model
  - Returns 404 if model not found

---

### 108. Create Model (Admin Only)
- **Method:** `POST`
- **Endpoint:** `/api/v1/models`
- **Auth Required:** Yes (Admin only)
- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "GPT-4o Mini",
  "slug": "gpt-4o-mini",
  "description": "OpenAI GPT-4o Mini model",
  "provider": "openai",
  "modelName": "gpt-4o-mini",
  "isActive": true,
  "isDefault": false,
  "metadata": null
}
```
- **Field Requirements:**
  - `name` (required): Display name of the model (1-255 characters)
  - `slug` (required): URL-friendly identifier (1-255 characters, lowercase letters, numbers, and hyphens only). Must be unique.
  - `description` (optional): Model description (max 1000 characters)
  - `provider` (optional): AI provider. One of: `openai`, `gemini`, `aws`, `anthropic`, `local`. Defaults to `aws`.
  - `modelName` (optional): Specific model identifier (e.g., "gpt-4o-mini", "gemini-1.5-flash")
  - `isActive` (optional): Whether the model should be active. Defaults to `true`.
  - `isDefault` (optional): Whether this should be the default model. Defaults to `false`.
  - `metadata` (optional): Additional configuration/metadata as JSON object
- **Response:**
```json
{
  "success": true,
  "data": {
    "model": {
      "id": "2ce1e3e8-cf21-4123-ae90-5058ad94268b",
      "name": "GPT-4o Mini",
      "slug": "gpt-4o-mini",
      "description": "OpenAI GPT-4o Mini model",
      "provider": "openai",
      "modelName": "gpt-4o-mini",
      "isActive": true,
      "isDefault": false,
      "metadata": null,
      "createdAt": "2026-02-05T12:55:27.391Z",
      "updatedAt": "2026-02-05T12:55:27.391Z"
    }
  },
  "message": "Model created successfully"
}
```
- **Notes:**
  - **Admin access required** - Only users with admin role can create models
  - Slug must be unique across all models
  - Returns 409 Conflict if slug already exists
  - Returns 403 Forbidden if user is not an admin
  - Model can be used in chats once created and active

---

## Health & Info Endpoints

### 104. Health Check
- **Method:** `GET`
- **Endpoint:** `/health`
- **Auth Required:** No
- **Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-17T10:00:00.000Z",
  "uptime": 3600.5,
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

### 105. API Info
- **Method:** `GET`
- **Endpoint:** `/api/v1`
- **Auth Required:** No
- **Response:**
```json
{
  "success": true,
  "data": {
    "name": "youruniverse.ai API",
    "version": "v1",
    "status": "healthy",
    "timestamp": "2024-12-17T10:00:00.000Z",
    "documentation": "/api/v1/docs"
  },
  "message": "Welcome to youruniverse.ai API"
}
```
- **Notes:**
  - Root API endpoint for version information
  - Returns API metadata and status
  - No authentication required

---

## Idempotency

### 🔄 Idempotency-Key Implementation

The API implements **idempotency** to prevent duplicate mutations and ensure safe retries. All `POST`, `PUT`, `PATCH`, and `DELETE` requests support idempotency keys.

#### How It Works

1. **Client generates unique key** (UUID recommended)
2. **Client sends request** with `Idempotency-Key` header
3. **Server checks cache** for existing response
4. **If cached**: Returns cached response immediately (no processing)
5. **If not cached**: Processes request, caches response, returns result

#### Idempotency-Key Header

- **Header Name**: `Idempotency-Key` (case-insensitive)
- **Format**: 8-128 characters, alphanumeric + hyphens/underscores
- **Recommended**: UUID v4 (36 characters)
- **Scope**: Per user, per endpoint, per request body

**Example:**
```http
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

#### Request Body Hashing

The system includes a hash of the request body in the cache key. This means:
- ✅ Same idempotency key + same body = cached response
- ✅ Same idempotency key + different body = different response (new request)

#### Response Headers

**On Cached Response (Replay):**
```http
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
X-Idempotency-Replay: true
```

**On New Request:**
```http
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

#### Concurrent Request Handling

If multiple requests arrive with the same idempotency key:
1. First request acquires lock and processes
2. Subsequent requests:
   - Check cache (if first request completed)
   - Retry with exponential backoff (up to 5 times)
   - Return cached response if available
   - Return `409 Conflict` if still processing after retries

#### Error Responses

**400 Bad Request - Invalid Key:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_IDEMPOTENCY_KEY",
    "message": "Invalid Idempotency-Key header. Must be 8-128 characters."
  }
}
```

**409 Conflict - Concurrent Request:**
```json
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "A request with this idempotency key is already being processed. Please retry after a moment."
  }
}
```

#### Best Practices

1. **Generate Unique Keys**
   ```typescript
   import { randomUUID } from 'crypto';
   const idempotencyKey = randomUUID();
   ```

2. **Use Same Key for Retries**
   - If request fails, retry with the same idempotency key
   - Server will return cached response if original succeeded

3. **Key Lifetime**
   - Responses cached for **24 hours**
   - After 24 hours, same key can be reused for new requests

4. **Client-Side Retry Logic**
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

#### Example Usage

**First Request:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"name":"John","email":"john@example.com","password":"Pass123!"}'
```

**Duplicate Request (Returns Cached Response):**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"name":"John","email":"john@example.com","password":"Pass123!"}'
```

**Response Headers:**
```http
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
X-Idempotency-Replay: true
```

#### Storage & Performance

- ✅ Idempotency keys stored in **Redis** (not PostgreSQL) - optimized for fast lookups
- ✅ Redis prefix: `idempotency:` with 24-hour TTL
- ✅ Lock prefix: `idempotency:lock:` with 60-second TTL for concurrent requests
- ✅ Automatic cleanup: Redis TTL removes expired keys automatically
- ✅ Fail-open: If Redis unavailable, requests proceed without idempotency caching
- ✅ Fast lookups: O(1) time complexity for duplicate detection
- ✅ Scalable: Works across multiple servers (distributed caching)

#### Notes

- ✅ Idempotency is **optional** - requests work without it
- ✅ Idempotency keys are **scoped per user** (authenticated) or per IP (anonymous)
- ✅ Cache includes **request body hash** - different bodies = different responses
- ✅ Responses cached for **24 hours**
- ✅ Only successful responses (2xx-4xx) are cached (not 5xx errors)
- ✅ Maximum cached response size: **1MB**
- ✅ Concurrent request handling with exponential backoff retry (up to 5 attempts)
- ✅ Lock mechanism prevents duplicate processing of same request

---

## Notes

### General Notes

#### Authentication
- All authenticated endpoints require `Authorization: Bearer <access_token>` header
- **2FA is mandatory** for all login attempts (OTP verification required)
- Access tokens expire in **15 minutes**
- Refresh tokens expire in **7 days**
- Token rotation: Refresh tokens are rotated on every refresh
- All sessions are invalidated on password change/reset

#### Idempotency
- `Idempotency-Key` header is **required** for critical operations:
  - **Account Creation**: Register (prevents duplicate account creation)
  - **Payment Operations**: Purchase Subscription, Upgrade Subscription, Buy Tokens (prevents double charging)
  - **Critical Security Operations**: Reset Password, Change Password, Delete Account (prevents accidental duplicate operations)
- Idempotency-Key is **optional** but **highly recommended** for these operations to prevent duplicate requests
- Responses cached for **24 hours**
- Prevents duplicate mutations and ensures safe retries

#### Rate Limiting
- **General**: 100 requests per minute per IP
- **Authentication endpoints**: 5 requests per minute per IP/endpoint
- **Username checks**: 30 requests per minute per IP
- **Upload endpoints**: 10 requests per minute per user
- **Sensitive operations**: 3 requests per minute per user
- Rate limit headers included in all responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets
  - `Retry-After`: Seconds to wait before retrying (when limit exceeded)

#### Data Formats
- All timestamps are in **ISO 8601 format (UTC)**
- Phone numbers must be in **E.164 format** (e.g., `+1234567890`)
- Email is **required** for registration, phone number is **optional**
- Usernames: 3-30 characters, alphanumeric + underscores/hyphens
- Passwords: Minimum 8 characters with uppercase, lowercase, number, and special character

#### Security Features
- **Input Validation**: All inputs validated with Zod schemas
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: Helmet.js security headers
- **CORS**: Configurable origin restrictions
- **Error Sanitization**: No sensitive data in production error messages
- **Request Logging**: All requests logged with context (dev mode only for body)

#### Performance
- **Redis Caching**: Username availability, sessions, rate limits, idempotency
- **Database Optimization**: Query logging for slow queries (>1000ms in dev)
- **Connection Pooling**: Optimized database connections
- **Graceful Degradation**: Services continue if Redis unavailable (fail-open)

### Error Responses
All errors follow this standardized format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details (optional, only in development or for validation errors)
    }
  }
}
```

#### Standard Error Codes
- `VALIDATION_ERROR` (422) - Input validation failures
- `BAD_REQUEST` (400) - Invalid request format
- `UNAUTHORIZED` (401) - Authentication required or invalid token
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource conflict (e.g., duplicate email/username)
- `TOO_MANY_REQUESTS` (429) - Rate limit exceeded
- `INTERNAL_SERVER_ERROR` (500) - Unexpected server errors
- `DATABASE_ERROR` (500) - Database operation failures
- `REDIS_ERROR` (503) - Cache service failures
- `NETWORK_ERROR` (503) - Network operation failures
- `EMAIL_SERVICE_ERROR` (503) - Email service failures
- `SMS_SERVICE_ERROR` (503) - SMS service failures
- `SERVICE_UNAVAILABLE` (503) - Service temporarily unavailable
- `TIMEOUT_ERROR` (408) - Request timeout
- `TOKEN_EXPIRED` (401) - Authentication token expired

#### Error Response Features
- **Error IDs**: Each error includes a unique error ID (`err_timestamp_random`) for tracking
- **Production Safety**: Error messages are sanitized in production (no stack traces)
- **Development Mode**: Full error details and stack traces in development
- **Context Logging**: All errors are logged with request context (path, method, IP, user ID)

### Pagination
All list endpoints support pagination:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Architecture & Implementation Details

### Technology Stack
- **Runtime**: Node.js 20+ (ESM)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (ioredis)
- **Authentication**: JWT (jose library)
- **Validation**: Zod schemas
- **Logging**: Pino logger
- **Error Handling**: Centralized error handler with custom error classes

### Code Structure
```
src/
├── core/              # Core infrastructure
│   ├── constants/     # Centralized constants
│   ├── interfaces/    # TypeScript interfaces
│   └── decorators/    # Decorators (auth, etc.)
├── endpoints/         # API route handlers (Next.js App Router style)
├── middleware/        # Express middleware
├── modules/           # Business logic modules
├── lib/               # Infrastructure (Prisma, Redis, Logger)
├── utils/             # Utility functions
└── config/            # Configuration management
```

### Error Handling
- **Global Error Handler**: Catches all errors and formats responses
- **Custom Error Classes**: AppError with specific error types
- **Prisma Error Mapping**: Comprehensive handling of all Prisma error codes
- **JWT Error Handling**: Token validation, expiration, signature errors
- **Network Error Handling**: Connection failures, timeouts
- **Graceful Fallbacks**: Services continue if Redis/Email/SMS unavailable

### Security Features
- **Helmet.js**: Security headers (CSP, XSS protection, etc.)
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: Redis-based sliding window algorithm
- **Input Validation**: Zod schema validation on all inputs
- **SQL Injection Protection**: Prisma ORM parameterized queries
- **Password Hashing**: Argon2id with secure parameters
- **Token Security**: Short-lived access tokens, refresh token rotation

### Performance Optimizations
- **Redis Caching**: Username availability, sessions, rate limits
- **Query Optimization**: Slow query detection and logging
- **Connection Pooling**: Database and Redis connection management
- **Graceful Degradation**: Fail-open strategy for non-critical services
- **Request Logging**: Structured logging with Pino

### Development vs Production
- **Development**: Full error details, stack traces, query logging, request body logging
- **Production**: Sanitized errors, no stack traces, minimal logging, optimized performance

---

**Last Updated:** December 2024  
**API Version:** v1.0.0  
**Backend Version:** 1.0.0 (Enterprise Refactored)

