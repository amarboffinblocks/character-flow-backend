# Swagger API Documentation Setup

## ✅ Setup Complete

Swagger UI has been successfully integrated into the youruniverse.ai backend.

## 📍 Access Points

Once the server is running, access the API documentation at:

- **Swagger UI (Interactive):** `http://localhost:8000/api-docs`
- **Swagger JSON:** `http://localhost:8000/api-docs.json`
- **Swagger YAML:** `http://localhost:8000/api-docs.yaml`

## 🚀 Quick Start

### 1. Start the Server

```bash
cd youruniverse-backend
npm run dev
```

### 2. Open Swagger UI

Open your browser and navigate to:
```
http://localhost:8000/api-docs
```

### 3. Authenticate (for protected endpoints)

1. Click the **"Authorize"** button (🔒) at the top right
2. Enter your Bearer token: `Bearer <your_access_token>`
3. Click **"Authorize"**
4. Token will be persisted for all subsequent requests

### 4. Test APIs

1. Expand any endpoint section
2. Click **"Try it out"** button
3. Fill in required parameters/request body
4. Click **"Execute"**
5. View the response below

## 📚 Documentation Coverage

All completed modules are documented:

- ✅ **Authentication Module** (11 endpoints)
- ✅ **User Module** (5 endpoints)
- ✅ **Character Module** (14 endpoints)
- ✅ **Persona Module** (8 endpoints)
- ✅ **Lorebook Module** (13 endpoints)
- ✅ **Tags Module** (6 endpoints)
- ✅ **Chat Module** (10 endpoints)

**Total: 67 API endpoints**

## 🎨 Features

- **Interactive Testing:** Test APIs directly from the browser
- **Authentication Support:** Bearer token authentication
- **Search & Filter:** Find endpoints quickly
- **Request/Response Examples:** See example payloads
- **Schema Definitions:** View data models
- **Try It Out:** Enabled by default for easy testing
- **Persistent Auth:** Token saved in browser session

## 🔧 Configuration

Swagger configuration is located in: `src/lib/swagger.ts`

### Customization

You can customize:
- **UI Theme:** Modify `customCss`
- **Default Options:** Adjust `swaggerOptions`
- **Spec File Path:** Update path to `API_SWAGGER.yaml`

## 📝 Updating Documentation

To update the API documentation:

1. Edit `API_SWAGGER.yaml` in the project root
2. Restart the server
3. Changes will be automatically reflected in Swagger UI

## 🛠️ Troubleshooting

### Swagger UI not loading

1. **Check file exists:** Verify `API_SWAGGER.yaml` is in project root
2. **Check server logs:** Look for Swagger setup errors
3. **Verify dependencies:** Ensure `js-yaml` and `swagger-ui-express` are installed
4. **Check path:** Verify file path in `src/lib/swagger.ts`

### YAML parsing errors

1. **Validate YAML:** Use online YAML validator
2. **Check indentation:** YAML is sensitive to indentation
3. **Verify format:** Ensure OpenAPI 3.0.3 compliance

### Authentication not working

1. **Token format:** Must be `Bearer <token>` (include "Bearer" prefix)
2. **Token validity:** Check if token is expired
3. **Token source:** Get token from login endpoint first

## 🔒 Production Considerations

For production deployment, consider:

1. **Disable in production:**
   ```typescript
   if (config.app.isDev) {
     setupSwagger(app);
   }
   ```

2. **Protect with authentication:**
   ```typescript
   app.use('/api-docs', requireAuth, swaggerUi.serve);
   ```

3. **Environment variable control:**
   ```typescript
   if (process.env.ENABLE_SWAGGER === 'true') {
     setupSwagger(app);
   }
   ```

## 📦 Installed Packages

- `swagger-ui-express` - Swagger UI middleware
- `js-yaml` - YAML parser
- `@types/swagger-ui-express` - TypeScript types
- `@types/js-yaml` - TypeScript types

## 📖 Related Files

- **Swagger Spec:** `API_SWAGGER.yaml`
- **Swagger Setup:** `src/lib/swagger.ts`
- **App Integration:** `src/app.ts`
- **API Endpoints List:** `API_ENDPOINTS_LIST.md`

## 🎯 Example Usage

### Testing Login Endpoint

1. Navigate to `/api-docs`
2. Expand **Authentication** → **Login**
3. Click **"Try it out"**
4. Enter request body:
   ```json
   {
     "identifier": "user@example.com",
     "password": "Password123!"
   }
   ```
5. Click **"Execute"**
6. View response with `userId` and OTP details

### Testing Protected Endpoint

1. First, authenticate using the **Authorize** button
2. Enter your Bearer token
3. Navigate to any protected endpoint
4. Click **"Try it out"**
5. Execute - token will be automatically included

---

**Setup Date:** January 2025  
**Status:** ✅ Active and Ready
