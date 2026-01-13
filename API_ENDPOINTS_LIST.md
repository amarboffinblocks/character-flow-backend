# API Endpoints List - Completed Modules

Complete list of all implemented API endpoints organized by module.

**Base URL:** `http://localhost:8000/api/v1` (Development) | `https://api.youruniverse.ai/api/v1` (Production)

**Authentication:** All protected endpoints require `Authorization: Bearer <access_token>` header.

---

## 📋 Table of Contents

1. [Authentication Module](#1-authentication-module)
2. [User Module](#2-user-module)
3. [Character Module](#3-character-module)
4. [Persona Module](#4-persona-module)
5. [Lorebook Module](#5-lorebook-module)
6. [Tags Module](#6-tags-module)

---

## 1. Authentication Module

### 1.1 Register User
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/register`
- **Auth Required:** No
- **Description:** Register a new user account. Email verification required before login.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "username": "johndoe",
    "email": "user@example.com",
    "phoneNumber": "+1234567890",  // Optional
    "password": "Password123!"
  }
  ```

### 1.2 Verify Email
- **Method:** `GET`
- **Endpoint:** `/api/v1/auth/verify?token=<verification_token>`
- **Auth Required:** No
- **Description:** Verify user email using token sent via email.

### 1.3 Resend Verification Email
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/resend-verification`
- **Auth Required:** No
- **Description:** Resend email verification token.
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```

### 1.4 Login (Step 1: Request OTP)
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/login`
- **Auth Required:** No
- **Description:** Authenticate user and receive OTP. Email verification required.
- **Request Body:**
  ```json
  {
    "identifier": "user@example.com",  // Email, username, or phone (E.164)
    "password": "Password123!"
  }
  ```

### 1.5 Verify OTP (Step 2: Complete Login)
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/login/verify-otp`
- **Auth Required:** No
- **Description:** Verify OTP code and receive access/refresh tokens.
- **Request Body:**
  ```json
  {
    "userId": "uuid",
    "code": "123456"
  }
  ```

### 1.6 Resend OTP
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/login/resend-otp`
- **Auth Required:** No
- **Description:** Resend OTP code for login.
- **Request Body:**
  ```json
  {
    "userId": "uuid"
  }
  ```

### 1.7 Check Username Availability
- **Method:** `GET`
- **Endpoint:** `/api/v1/auth/username/check?username=johndoe`
- **Auth Required:** No
- **Description:** Check if username is available (real-time validation).

### 1.8 Refresh Token
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/refresh`
- **Auth Required:** No
- **Description:** Get new access token using refresh token (token rotation).
- **Request Body:**
  ```json
  {
    "refreshToken": "refresh_token_here"
  }
  ```

### 1.9 Logout
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/logout`
- **Auth Required:** Yes
- **Description:** Logout user and revoke refresh token.
- **Request Body:**
  ```json
  {
    "refreshToken": "refresh_token_here"
  }
  ```

### 1.10 Forgot Password
- **Method:** `POST`
- **Endpoint:** `/api/v1/auth/forgot-password`
- **Auth Required:** No
- **Description:** Request password reset link via email.
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```

### 1.11 Reset Password
- **Method:** `PUT`
- **Endpoint:** `/api/v1/auth/reset-password`
- **Auth Required:** No
- **Description:** Reset password using token from email.
- **Request Body:**
  ```json
  {
    "token": "password_reset_token",
    "password": "NewPassword123!"
  }
  ```

---

## 2. User Module

### 2.1 Get Current User
- **Method:** `GET`
- **Endpoint:** `/api/v1/user/me`
- **Auth Required:** Yes
- **Description:** Get authenticated user's profile and preferences.

### 2.2 Update Profile
- **Method:** `PUT`
- **Endpoint:** `/api/v1/user/profile`
- **Auth Required:** Yes
- **Description:** Update user profile information and preferences.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "username": "johndoe",
    "aboutMe": "About me text",
    "theme": "dark-purple",
    "fontStyle": "sans-serif",
    "fontSize": "16",
    "language": "en",
    "tagsToFollow": ["tag1", "tag2"],
    "tagsToAvoid": ["tag3"],
    "profileVisibility": "public",
    "profileRating": "SFW"
  }
  ```

### 2.3 Update Profile Picture
- **Method:** `PUT`
- **Endpoint:** `/api/v1/user/profile-picture`
- **Auth Required:** Yes
- **Description:** Upload or update user avatar image.
- **Request:** `multipart/form-data` with `avatar` file

### 2.4 Change Password
- **Method:** `PUT`
- **Endpoint:** `/api/v1/user/change-password`
- **Auth Required:** Yes
- **Description:** Change user password (requires old password + MFA if enabled).
- **Request Body:**
  ```json
  {
    "oldPassword": "OldPassword123!",
    "newPassword": "NewPassword123!",
    "mfaCode": "123456"  // Optional, if MFA enabled
  }
  ```

### 2.5 Delete Account
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/user/delete`
- **Auth Required:** Yes
- **Description:** Permanently delete user account (requires password + MFA).
- **Request Body:**
  ```json
  {
    "password": "Password123!",
    "mfaCode": "123456"  // Optional, if MFA enabled
  }
  ```

---

## 3. Character Module

### 3.1 List Characters
- **Method:** `GET`
- **Endpoint:** `/api/v1/characters`
- **Auth Required:** Yes
- **Description:** Get paginated list of user's characters with filters.
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20, max: 100)
  - `search` (string)
  - `rating` (SFW | NSFW)
  - `visibility` (public | private)
  - `tags` (string, comma-separated)
  - `excludeTags` (string, comma-separated)
  - `isFavourite` (boolean)
  - `isSaved` (boolean)
  - `sortBy` (createdAt | updatedAt | name | chatCount, default: createdAt)
  - `sortOrder` (asc | desc, default: desc)

### 3.2 Create Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters`
- **Auth Required:** Yes
- **Description:** Create a new character with metadata and images.
- **Request:** `multipart/form-data` with character fields and optional `avatar`, `backgroundImage` files

### 3.3 Get Character
- **Method:** `GET`
- **Endpoint:** `/api/v1/characters/:id`
- **Auth Required:** Yes
- **Description:** Get full character details by ID.

### 3.4 Update Character
- **Method:** `PUT`
- **Endpoint:** `/api/v1/characters/:id`
- **Auth Required:** Yes
- **Description:** Update character fields including images.
- **Request:** `multipart/form-data` with character fields and optional `avatar`, `backgroundImage` files

### 3.5 Delete Character
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/characters/:id`
- **Auth Required:** Yes
- **Description:** Permanently delete character.

### 3.6 Toggle Favourite
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/favourite`
- **Auth Required:** Yes
- **Description:** Toggle character favourite status.

### 3.7 Toggle Saved
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/saved`
- **Auth Required:** Yes
- **Description:** Toggle character saved status.

### 3.8 Batch Delete Characters
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/batch-delete`
- **Auth Required:** Yes
- **Description:** Delete multiple characters at once.
- **Request Body:**
  ```json
  {
    "characterIds": ["uuid1", "uuid2", "uuid3"]
  }
  ```

### 3.9 Batch Duplicate Characters
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/batch-duplicate`
- **Auth Required:** Yes
- **Description:** Duplicate multiple characters at once.
- **Request Body:**
  ```json
  {
    "characterIds": ["uuid1", "uuid2", "uuid3"]
  }
  ```

### 3.10 Import Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/import`
- **Auth Required:** Yes
- **Description:** Import a character from JSON or PNG file.
- **Request:** `multipart/form-data` with `file` (JSON or PNG)

### 3.11 Bulk Import Characters
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/import/bulk`
- **Auth Required:** Yes
- **Description:** Import multiple characters from JSON file (array).
- **Request:** `multipart/form-data` with `file` (JSON array)

### 3.12 Export Character
- **Method:** `POST`
- **Endpoint:** `/api/v1/characters/:id/export?format=json|png`
- **Auth Required:** Yes
- **Description:** Export character as JSON or PNG file.
- **Query Parameters:**
  - `format` (json | png, default: json)

### 3.13 Get Character by Slug
- **Method:** `GET`
- **Endpoint:** `/api/v1/characters/slug/:slug`
- **Auth Required:** No (public access if character is public)
- **Description:** Get character details by slug.

### 3.14 Get Public Characters
- **Method:** `GET`
- **Endpoint:** `/api/v1/characters/public`
- **Auth Required:** No (optional auth for personalized results)
- **Description:** Get list of public characters.
- **Query Parameters:** Same as List Characters

---

## 4. Persona Module

### 4.1 List Personas
- **Method:** `GET`
- **Endpoint:** `/api/v1/personas`
- **Auth Required:** Yes
- **Description:** Get paginated list of user's personas with filters.
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20, max: 100)
  - `search` (string)
  - `rating` (SFW | NSFW)
  - `visibility` (public | private)
  - `tags` (string, comma-separated)
  - `excludeTags` (string, comma-separated)
  - `isFavourite` (boolean)
  - `isSaved` (boolean)
  - `sortBy` (createdAt | updatedAt | name, default: createdAt)
  - `sortOrder` (asc | desc, default: desc)

### 4.2 Create Persona
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas`
- **Auth Required:** Yes
- **Description:** Create a new persona with metadata and images.
- **Request:** `multipart/form-data` with persona fields and optional `avatar`, `backgroundImage` files

### 4.3 Get Persona
- **Method:** `GET`
- **Endpoint:** `/api/v1/personas/:id`
- **Auth Required:** Yes
- **Description:** Get full persona details by ID.

### 4.4 Update Persona
- **Method:** `PUT`
- **Endpoint:** `/api/v1/personas/:id`
- **Auth Required:** Yes
- **Description:** Update persona fields including images.
- **Request:** `multipart/form-data` with persona fields and optional `avatar`, `backgroundImage` files

### 4.5 Delete Persona
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/personas/:id`
- **Auth Required:** Yes
- **Description:** Permanently delete persona.

### 4.6 Toggle Favourite
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/:id/favourite`
- **Auth Required:** Yes
- **Description:** Toggle persona favourite status.

### 4.7 Toggle Saved
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/:id/saved`
- **Auth Required:** Yes
- **Description:** Toggle persona saved status.

### 4.8 Batch Delete Personas
- **Method:** `POST`
- **Endpoint:** `/api/v1/personas/batch-delete`
- **Auth Required:** Yes
- **Description:** Delete multiple personas at once.
- **Request Body:**
  ```json
  {
    "personaIds": ["uuid1", "uuid2", "uuid3"]
  }
  ```

---

## 5. Lorebook Module

### 5.1 List Lorebooks
- **Method:** `GET`
- **Endpoint:** `/api/v1/lorebooks`
- **Auth Required:** Yes
- **Description:** Get paginated list of user's lorebooks with filters.
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20, max: 100)
  - `search` (string)
  - `rating` (SFW | NSFW)
  - `visibility` (public | private)
  - `tags` (string, comma-separated)
  - `excludeTags` (string, comma-separated)
  - `isFavourite` (boolean)
  - `isSaved` (boolean)
  - `sortBy` (createdAt | updatedAt | name, default: createdAt)
  - `sortOrder` (asc | desc, default: desc)

### 5.2 Create Lorebook
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks`
- **Auth Required:** Yes
- **Description:** Create a new lorebook with entries and links.
- **Request:** `multipart/form-data` with lorebook fields, `entries` (JSON array), optional `avatar` file
- **Request Body Example:**
  ```json
  {
    "name": "My Lorebook",
    "description": "Description",
    "rating": "SFW",
    "visibility": "private",
    "tags": ["tag1", "tag2"],
    "entries": [
      {
        "keywords": ["keyword1", "keyword2"],
        "context": "Context text",
        "isEnabled": true,
        "priority": 0
      }
    ],
    "characterIds": ["uuid1", "uuid2"],
    "personaIds": ["uuid3"]
  }
  ```

### 5.3 Get Lorebook
- **Method:** `GET`
- **Endpoint:** `/api/v1/lorebooks/:id`
- **Auth Required:** Yes
- **Description:** Get full lorebook details including entries.

### 5.4 Update Lorebook
- **Method:** `PUT`
- **Endpoint:** `/api/v1/lorebooks/:id`
- **Auth Required:** Yes
- **Description:** Update lorebook fields including entries.
- **Request:** `multipart/form-data` with lorebook fields, `entries` (JSON array), optional `avatar` file

### 5.5 Delete Lorebook
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/lorebooks/:id`
- **Auth Required:** Yes
- **Description:** Permanently delete lorebook.

### 5.6 Toggle Favourite
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/:id/favourite`
- **Auth Required:** Yes
- **Description:** Toggle lorebook favourite status.

### 5.7 Toggle Saved
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/:id/saved`
- **Auth Required:** Yes
- **Description:** Toggle lorebook saved status.

### 5.8 List Lorebook Entries
- **Method:** `GET`
- **Endpoint:** `/api/v1/lorebooks/:id/entries`
- **Auth Required:** Yes
- **Description:** Get all entries for a lorebook.

### 5.9 Create Lorebook Entry
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/:id/entries`
- **Auth Required:** Yes
- **Description:** Add a new entry to a lorebook.
- **Request Body:**
  ```json
  {
    "keywords": ["keyword1", "keyword2"],
    "context": "Context text",
    "isEnabled": true,
    "priority": 0
  }
  ```

### 5.10 Update Lorebook Entry
- **Method:** `PUT`
- **Endpoint:** `/api/v1/lorebooks/:id/entries/:entryId`
- **Auth Required:** Yes
- **Description:** Update an existing lorebook entry.
- **Request Body:**
  ```json
  {
    "keywords": ["keyword1", "keyword2"],
    "context": "Updated context",
    "isEnabled": true,
    "priority": 1
  }
  ```

### 5.11 Delete Lorebook Entry
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/lorebooks/:id/entries/:entryId`
- **Auth Required:** Yes
- **Description:** Delete an entry from a lorebook.

### 5.12 Batch Delete Lorebooks
- **Method:** `POST`
- **Endpoint:** `/api/v1/lorebooks/batch-delete`
- **Auth Required:** Yes
- **Description:** Delete multiple lorebooks at once.
- **Request Body:**
  ```json
  {
    "lorebookIds": ["uuid1", "uuid2", "uuid3"]
  }
  ```

### 5.13 Get Lorebook by Slug
- **Method:** `GET`
- **Endpoint:** `/api/v1/lorebooks/slug/:slug`
- **Auth Required:** No (public access if lorebook is public)
- **Description:** Get lorebook details by slug.

---

## 6. Tags Module

### 6.1 List Tags
- **Method:** `GET`
- **Endpoint:** `/api/v1/tags`
- **Auth Required:** Yes
- **Description:** Get paginated list of tags.
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20, max: 100)
  - `category` (SFW | NSFW)
  - `search` (string)

### 6.2 Create Tag
- **Method:** `POST`
- **Endpoint:** `/api/v1/tags`
- **Auth Required:** Yes
- **Description:** Create a new tag.
- **Request Body:**
  ```json
  {
    "name": "tag-name",
    "category": "SFW",
    "description": "Tag description"
  }
  ```

### 6.3 Get Tag
- **Method:** `GET`
- **Endpoint:** `/api/v1/tags/:id`
- **Auth Required:** Yes
- **Description:** Get tag details by ID.

### 6.4 Update Tag
- **Method:** `PUT`
- **Endpoint:** `/api/v1/tags/:id`
- **Auth Required:** Yes
- **Description:** Update tag details.
- **Request Body:**
  ```json
  {
    "name": "updated-tag-name",
    "category": "NSFW",
    "description": "Updated description"
  }
  ```

### 6.5 Delete Tag
- **Method:** `DELETE`
- **Endpoint:** `/api/v1/tags/:id`
- **Auth Required:** Yes
- **Description:** Delete a tag.

### 6.6 Get Popular Tags
- **Method:** `GET`
- **Endpoint:** `/api/v1/tags/popular`
- **Auth Required:** Yes
- **Description:** Get most popular tags by usage count.
- **Query Parameters:**
  - `limit` (integer, default: 20, max: 100)
  - `category` (SFW | NSFW)

---

## Summary

### Total Endpoints by Module

| Module | Endpoints Count |
|--------|----------------|
| **Authentication** | 11 |
| **User** | 5 |
| **Character** | 14 |
| **Persona** | 8 |
| **Lorebook** | 13 |
| **Tags** | 6 |
| **TOTAL** | **57** |

### Endpoint Types Breakdown

- **GET:** 24 endpoints
- **POST:** 24 endpoints
- **PUT:** 6 endpoints
- **DELETE:** 3 endpoints

### Common Features Across Modules

- ✅ Pagination support (page, limit)
- ✅ Filtering (search, rating, visibility, tags)
- ✅ Sorting (sortBy, sortOrder)
- ✅ Favourite/Saved toggles
- ✅ Batch operations (delete, duplicate)
- ✅ Import/Export functionality
- ✅ Public/Private visibility
- ✅ SFW/NSFW rating system

---

## Notes

- All endpoints return JSON responses
- Success responses follow: `{ success: true, data: {...}, message: "..." }`
- Error responses follow: `{ success: false, error: { code: "...", message: "..." } }`
- Protected endpoints require `Authorization: Bearer <access_token>` header
- File uploads use `multipart/form-data` content type
- Rate limiting: Auth (5/min), General (100/min), Uploads (10/min)
- Idempotency: Include `Idempotency-Key` header for POST/PUT/PATCH requests

---

**Last Updated:** January 2025  
**API Version:** v1.0.0
