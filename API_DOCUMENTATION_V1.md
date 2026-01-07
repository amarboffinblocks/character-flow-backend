# youruniverse.ai - Backend API Documentation v1

## Project Overview

**youruniverse.ai** is a token-based, subscription-driven AI platform where users create and interact with customizable **Characters**, **Personas**, **Lorebooks**, and **Realms**.

- **Characters** enable one-on-one or multi-character group chats
- **Personas** define behavior patterns
- **Lorebooks** store knowledge and lore
- **Realms** (folders) organize these elements and allow collaborative group interactions between multiple characters

### Key Features
- Dedicated chat interface active per selected character or realm
- Assets marked as `public`, `private`, `saved`, or `favourite`
- Download, select, and train AI models to shape character intelligence
- Token consumption based on subscription tiers
- Profile customization, background themes, and project-wide visual settings

---

## Subscription Plans

| Plan | Type | Description |
|------|------|-------------|
| **Adventurer** | Free | Limited tokens, basic features |
| **Explorer** | Monthly | Monthly subscription with token allocation |
| **Voyager** | Yearly | Yearly subscription with token allocation |
| **Pioneer** | Premium | Premium plan with highest token allocation |

---

## Enums & Shared Types

```typescript
enum Role {
  user = "user",
  admin = "admin"
}

enum SubscriptionPlan {
  adventurer = "adventurer",
  explorer = "explorer",
  voyager = "voyager",
  pioneer = "pioneer"
}

enum Rating {
  SFW = "SFW",
  NSFW = "NSFW"
}

enum Visibility {
  public = "public",
  private = "private"
}

enum PublishAs {
  username = "username",
  anonymous = "anonymous"
}
```

---

## Authentication & Security

### OAuth2 Implementation
- **Access Token**: Short-lived JWT (e.g., 15 minutes)
- **Refresh Token**: Long-lived JWT (e.g., 7 days)
- **Authorization Header**: `Authorization: Bearer <access_token>`

### Security Rules
- Refresh token rotation on every refresh
- Revoke on rotation failure
- MFA required for sensitive actions:
  - Password/email change
  - Subscription changes
  - Payout/billing
- `Idempotency-Key` header required on all `POST/PUT/PATCH` to prevent duplicate mutations
- Rate limiting on auth endpoints

---

## 1. User & Authentication Module

### User Schema

```prisma
model User {
  id                  String   @id @default(uuid())
  name                String
  username            String   @unique
  email               String   @unique
  password            String
  avatar              Json?
  backgroundImg       Json?
  role                String   @default("user")
  isEmailVerified     Boolean  @default(false)
  subscriptionPlan    String?
  tokensRemaining     Int      @default(0)
  tokensUsed          Int      @default(0) @map("tokens_used")
  profileVisibility   String   @default("private")
  profileRating       String   @default("SFW")
  theme               String?  // "dark-purple" | "white" | "yellow"
  fontStyle           String?  @map("font_style") // "serif" | "sans-serif" | "monospace"
  fontSize            String?  @map("font_size") // "12" | "16" | "20"
  language            String?  @default("en") // "en" | "hi" | "es"
  tagsToFollow        String[] @default([]) @map("tags_to_follow")
  tagsToAvoid         String[] @default([]) @map("tags_to_avoid")
  aboutMe             String?  @map("about_me")
  following           String[] @default([])
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  
  // Relations
  characters          Character[]
  personas            Persona[]
  lorebooks           Lorebook[]
  folders             Folder[]
  chats               Chat[]
  subscriptionHistory SubscriptionHistory[]
  authTokens          AuthToken[]
}
```

### User API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/register` | PUBLIC | Register new user account |
| `GET` | `/api/v1/auth/verify?token=token` | PUBLIC | Verifies user's email using token sent to the registered email |
| `POST` | `/api/v1/auth/login` | PUBLIC | Authenticates user with email+password. Returns access token, refresh token, and user info |
| `POST` | `/api/v1/auth/refresh` | PUBLIC | Issues a new access token and rotates the refresh token. Old refresh token becomes invalid immediately |
| `POST` | `/api/v1/auth/logout` | USER | Revokes refresh token, deletes active sessions |
| `POST` | `/api/v1/auth/forget-password` | PUBLIC | Sends a password-reset link to user email |
| `PUT` | `/api/v1/auth/reset-password` | PUBLIC | Updates password using the reset token |
| `GET` | `/api/v1/user/me` | USER | Returns authenticated user's profile, preferences, subscriptions, token usage |
| `PUT` | `/api/v1/user/profile` | USER | Update general profile info (name, username, about me, preferences, themes, fonts, tags) |
| `PUT` | `/api/v1/user/profile-picture` | USER | Uploads/changes user's avatar image and updates DB |
| `PUT` | `/api/v1/user/change-password` | USER | Updates password after verifying old password + MFA |
| `DELETE` | `/api/v1/user/delete` | USER | Permanently deletes the user account after password + MFA confirmation |

---

## 2. Subscription Module

### Subscription API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/subscription/plans` | USER | Returns list of available subscription plans with pricing, token allocation, and features |
| `GET` | `/api/v1/subscription/me` | USER | Returns user's current plan, expiry date, tokens remaining, total tokens used |
| `POST` | `/api/v1/subscription/purchase` | USER | User buys a subscription plan (Explorer, Voyager, Pioneer) |
| `POST` | `/api/v1/subscription/upgrade` | USER | Upgrade from lower tier → higher tier |
| `POST` | `/api/v1/subscription/downgrade` | USER | Schedules downgrade at the next billing cycle. Immediate downgrade is not allowed (standard SaaS rule) |
| `POST` | `/api/v1/subscription/cancel` | USER | Cancels auto-renewal. User retains benefits until expiry date |
| `POST` | `/api/v1/subscription/resume` | USER | Restores auto-renewal for users who previously cancelled |
| `POST` | `/api/v1/subscription/buy-tokens` | USER | Buy additional token packs without changing plan |
| `GET` | `/api/v1/subscription/tokens/history` | USER | Returns list of token transactions (credit/debit) with reason |
| `GET` | `/api/v1/subscription/history` | USER | Returns all subscription purchases, renewals, refunds |
| `POST` | `/api/v1/subscription/webhook` | PUBLIC | Handles: Payment success, Payment failure, Auto-renew event, Refunds |
| `GET` | `/api/v1/admin/subscription/plan` | ADMIN | Admin updates pricing, token allocation, descriptions |
| `GET` | `/api/v1/admin/subscription/users` | ADMIN | List all active subscribers with plan, expiry, and billing status |

---

## 3. Character Module

### Character Schema

```prisma
model Character {
  id                  String   @id @default(uuid())
  userId              String
  name                String
  slug                String   @unique
  description         String?
  scenario            String?         // Character scenario/lore setup
  summary             String?         // Personality summary
  rating              String   @default("SFW") // SFW | NSFW
  visibility          String   @default("private") // public | private
  isFavourite         Boolean  @default(false)
  isSaved             Boolean  @default(false)
  avatar              Json?
  backgroundImg       Json?
  tags                String[] @default([])
  firstMessage        String?
  alternateMessages   String[] @default([])
  exampleDialogues    String[] @default([])
  authorNotes         String?
  characterNotes      String?
  personaId           String?
  lorebookId          String?
  folderId            String?
  chatCount           Int      @default(0)
  tokens              Int?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  // Relations
  user                User      @relation(fields: [userId], references: [id])
  persona             Persona?  @relation(fields: [personaId], references: [id])
  lorebook            Lorebook? @relation(fields: [lorebookId], references: [id])
  chats               Chat[]
}
```

### Character API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/characters` | USER | Create a new character with full metadata (avatar, bg, personality fields, messages, persona/lorebook links) |
| `GET` | `/api/v1/characters` | USER | List all characters of the user with filters: rating, visibility, favorite, saved, publicOnly, sort, search |
| `GET` | `/api/v1/characters/:id` | USER | Get full character details including avatar, messages, persona links, lorebook links |
| `PUT` | `/api/v1/characters/:id` | USER | Update character fields including messages, avatar, notes, scenario, tags, rating, visibility |
| `DELETE` | `/api/v1/characters/:id` | USER | Permanently delete character + options to delete chats |
| `POST` | `/api/v1/characters/:id/favorite` | USER | Toggle favourite |
| `POST` | `/api/v1/characters/:id/save` | USER | Toggle saved status |
| `POST` | `/api/v1/characters/:id/avatar` | USER | Upload/update avatar image |
| `POST` | `/api/v1/characters/:id/background` | USER | Upload/update background image |
| `POST` | `/api/v1/characters/:id/duplicate` | USER | Duplicate the entire character including messages & config |
| `POST` | `/api/v1/characters/:id/link/persona/:personaId` | USER | Attach persona to character |
| `POST` | `/api/v1/characters/:id/unlink/persona` | USER | Remove persona |
| `POST` | `/api/v1/characters/:id/link/lorebook/:lorebookId` | USER | Attach lorebook |
| `POST` | `/api/v1/characters/:id/unlink/lorebook` | USER | Remove lorebook |
| `POST` | `/api/v1/characters/:id/link/folder/:folderId` | USER | Add character to a realm/folder |
| `POST` | `/api/v1/characters/:id/export` | USER | Export character as .png or .json (with embedded metadata) |
| `POST` | `/api/v1/characters/import` | USER | Import a character from PNG/JSON |
| `POST` | `/api/v1/characters/import/bulk` | USER | Import multiple characters in bulk (.zip) |
| `GET` | `/api/v1/characters/public` | USER | Explore public characters (only if they are visible = public) |
| `GET` | `/api/v1/characters/public/:id` | USER | View any public character |

---

## 4. Persona Module

### Persona Schema

```prisma
model Persona {
  id              String   @id @default(uuid())
  userId          String
  name            String
  slug            String   @unique
  description     String?
  visibility      String   @default("private")   // public | private
  rating          String   @default("SFW")       // SFW | NSFW
  isFavourite     Boolean  @default(false)
  isSaved         Boolean  @default(false)
  avatar          Json?
  backgroundImg   Json?
  tags            String[] @default([])
  lorebookId      String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  user            User      @relation(fields: [userId], references: [id])
  lorebook        Lorebook? @relation(fields: [lorebookId], references: [id])
}
```

### Persona API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/personas` | USER | Create a new persona with full metadata (avatar, behaviour, dialogues, tags) |
| `GET` | `/api/v1/personas` | USER | List personas with filters: visibility, favorite, saved, rating, tags, search, sort |
| `GET` | `/api/v1/personas/:id` | USER | Get full persona details including behaviour, dialogues, linked characters |
| `PUT` | `/api/v1/personas/:id` | USER | Update persona: avatar, behaviour, tags, notes, dialogues, visibility |
| `DELETE` | `/api/v1/personas/:id` | USER | Permanently delete persona (only if not linked to characters or force delete option) |
| `POST` | `/api/v1/personas/:id/favorite` | USER | Toggle favourite status |
| `POST` | `/api/v1/personas/:id/save` | USER | Toggle saved status |
| `POST` | `/api/v1/personas/:id/avatar` | USER | Upload/update persona avatar image |
| `POST` | `/api/v1/personas/:id/duplicate` | USER | Duplicate persona including all dialogues and config |
| `POST` | `/api/v1/personas/import` | USER | Import persona from PNG/JSON with embedded metadata |
| `POST` | `/api/v1/personas/import/bulk` | USER | Bulk import multiple personas (ZIP) |
| `POST` | `/api/v1/personas/:id/export` | USER | Export persona as .png or .json |

---

## 5. Lorebook Module

### Lorebook Schema

```prisma
model Lorebook {
  id              String           @id @default(uuid())
  userId          String
  name            String
  slug            String           @unique
  description     String?
  visibility      String           @default("private")     // public | private
  rating          String           @default("SFW")         // SFW | NSFW
  isFavourite     Boolean          @default(false)
  isSaved         Boolean          @default(false)
  avatar          Json?
  tags            String[]         @default([])
  entries         LorebookEntry[]  // Relational entries
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  
  // Relations
  user            User             @relation(fields: [userId], references: [id])
}

model LorebookEntry {
  id          String   @id @default(uuid())
  lorebookId  String
  keyword     String
  context     String
  
  // Relations
  lorebook    Lorebook @relation(fields: [lorebookId], references: [id])
}
```

### Lorebook API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/lorebooks` | USER | Create a new lorebook (name, visibility, rating, tags, avatar, entries, links) |
| `GET` | `/api/v1/lorebooks` | USER | List user lorebooks with filters: visibility, favourite, saved, rating, tags, search, sort |
| `GET` | `/api/v1/lorebooks/:id` | USER | Get full lorebook details including entries, tags, visibility, rating, links |
| `PUT` | `/api/v1/lorebooks/:id` | USER | Update lorebook fields: name, tags, avatar, rating, visibility, character link, persona link, entries |
| `DELETE` | `/api/v1/lorebooks/:id` | USER | Permanently delete lorebook |
| `POST` | `/api/v1/lorebooks/:id/favorite` | USER | Toggle favourite status |
| `POST` | `/api/v1/lorebooks/:id/save` | USER | Toggle saved status |
| `POST` | `/api/v1/lorebooks/:id/avatar` | USER | Upload/update lorebook avatar image |
| `POST` | `/api/v1/lorebooks/:id/duplicate` | USER | Duplicate lorebook including all entries and config |
| `POST` | `/api/v1/lorebooks/import` | USER | Import lorebook from PNG/JSON with embedded metadata |
| `POST` | `/api/v1/lorebooks/import/bulk` | USER | Bulk import multiple lorebooks (ZIP) |
| `POST` | `/api/v1/lorebooks/:id/export` | USER | Export lorebook as .png or .json |

---

## 6. Realm Module

### Realm Schema

```prisma
model Realm {
  id          String      @id @default(uuid())
  userId      String
  name        String
  slug        String      @unique
  description String?
  tags        String[]    @default([])
  rating      String      @default("SFW")     // SFW | NSFW
  isFavourite Boolean     @default(false)
  visibility  String      @default("private") // public | private
  avatar      Json?
  
  // Many characters can belong to a realm
  characters  Character[]
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  // Relations
  user        User        @relation(fields: [userId], references: [id])
}
```

### Realm API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/realms` | USER | Create a new realm |
| `GET` | `/api/v1/realms` | USER | List realms with filters: visibility (all/public/private/saved/favourite), sort (alpha/date/rating), tags, search, pagination |
| `GET` | `/api/v1/realms/:id` | USER | Full realm details + included characters |
| `PUT` | `/api/v1/realms/:id` | USER | Update realm details |
| `DELETE` | `/api/v1/realms/:id` | USER | Delete permanently (blocked if characters linked unless force=true) |
| `POST` | `/api/v1/realms/:id/favourite` | USER | Toggle favourite |
| `POST` | `/api/v1/realms/:id/duplicate` | USER | Copies Realm + characters structure (not chats) |
| `POST` | `/api/v1/realms/:id/characters` | USER | Add character to realm `{ characterId }` |
| `DELETE` | `/api/v1/realms/:id/characters/:charId` | USER | Remove character from realm |
| `POST` | `/api/v1/realms/:id/avatar` | USER | Upload/replace image |
| `GET` | `/api/v1/realms/:id/share` | USER | Returns a shareable public link |
| `POST` | `/api/v1/realms/:id/export` | USER | Export as .json |
| `POST` | `/api/v1/realms/import` | USER | Upload .json |
| `POST` | `/api/v1/realms/import/bulk` | USER | ZIP upload |

---

## 7. Background Module

### Background Schema

```prisma
model Background {
  id              String   @id @default(uuid())
  userId          String?
  name            String?
  description     String?
  image           Json
  tags            String[] @default([])
  rating          String   @default("SFW") // SFW | NSFW
  isGlobalDefault Boolean  @default(false)
  isShared        Boolean  @default(false)
  
  // Optional links
  characterId     String?
  personaId       String?
  realmId         String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  user            User?      @relation(fields: [userId], references: [id])
  character       Character? @relation(fields: [characterId], references: [id])
  persona         Persona?   @relation(fields: [personaId], references: [id])
  realm           Realm?     @relation(fields: [realmId], references: [id])
}
```

### Background API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/backgrounds` | USER | Upload a new background image with metadata |
| `GET` | `/api/v1/backgrounds` | USER | Query Params: search, tags, excludeTags, rating, linkedTo (character/persona/realm), sort (date/name), page |
| `GET` | `/api/v1/backgrounds/:id` | USER | Get background details |
| `PUT` | `/api/v1/backgrounds/:id` | USER | Update name, tags, description, rating |
| `DELETE` | `/api/v1/backgrounds/:id` | USER | Permanently delete background |
| `POST` | `/api/v1/backgrounds/:id/default` | USER | Make this the global default background |
| `GET` | `/api/v1/backgrounds/:id/download` | USER | Download original image file |
| `POST` | `/api/v1/backgrounds/:id/duplicate` | USER | Clone background metadata + image |
| `POST` | `/api/v1/backgrounds/:id/share` | USER | Generate shareable link |
| `POST` | `/api/v1/backgrounds/:id/export` | USER | Export metadata + image as .json |
| `POST` | `/api/v1/backgrounds/:id/link/character` | USER | Link to character `{ "characterId": "uuid" }` |
| `POST` | `/api/v1/backgrounds/:id/link/persona` | USER | Link to persona `{ "personaId": "uuid" }` |
| `POST` | `/api/v1/backgrounds/:id/link/realm` | USER | Link to realm `{ "realmId": "uuid" }` |
| `POST` | `/api/v1/backgrounds/:id/unlink` | USER | Remove all associations |
| `POST` | `/api/v1/backgrounds/import` | USER | Import a single background file |
| `POST` | `/api/v1/backgrounds/import/bulk` | USER | Upload ZIP of multiple backgrounds |
| `POST` | `/api/v1/backgrounds/export` | USER | Bulk export `{ "ids": ["id1", "id2"] }` |
| `POST` | `/api/v1/backgrounds/link/account` | USER | Link multiple to account `{ "ids": [] }` |
| `POST` | `/api/v1/backgrounds/default/bulk` | USER | Set bulk defaults `{ "id": "uuid" }` |
| `POST` | `/api/v1/backgrounds/delete/bulk` | USER | Bulk delete `{ "ids": [] }` |

---

## API Response Standards

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [ ... ],
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

## Common HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | OK - Request successful |
| `201` | Created - Resource created successfully |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Authentication required |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource not found |
| `409` | Conflict - Resource already exists |
| `422` | Unprocessable Entity - Validation error |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |

---

## Rate Limiting

- Auth endpoints: 5 requests per minute
- General API: 100 requests per minute
- File uploads: 10 requests per minute

---

*Last Updated: December 2024*
*Version: 1.0.0*

