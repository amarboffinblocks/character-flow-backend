# Next.js App Router - Email Verification Integration Guide

This guide shows how to integrate email verification with your Next.js App Router frontend.

## Backend API Details

- **Endpoint:** `GET /api/v1/auth/verify`
- **Query Parameter:** `token` (required)
- **Base URL:** `http://localhost:8000` (development) or your production URL
- **Full URL:** `http://localhost:8000/api/v1/auth/verify?token=xxx`

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully"
  }
}
```

### Error Responses
```json
{
  "success": false,
  "error": {
    "message": "Invalid verification token" | "Verification token expired" | "Token already used"
  }
}
```

## Next.js Implementation

### 1. Create the Verify Email Page

Create a new file: `app/verify-email/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ApiResponse {
  success: boolean;
  data?: {
    message: string;
  };
  error?: {
    message: string;
  };
}

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      // Replace with your backend URL
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(
        `${backendUrl}/api/v1/auth/verify?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data: ApiResponse = await response.json();

      if (data.success && response.ok) {
        setStatus('success');
        setMessage(data.data?.message || 'Email verified successfully');
        
        // Optional: Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error?.message || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred while verifying your email. Please try again.');
      console.error('Verification error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifying Email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-block bg-green-100 rounded-full p-3 mb-4">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLineCap="round"
                  strokeLineJoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500 mb-4">
              Redirecting to login page...
            </p>
            <Link
              href="/login"
              className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="inline-block bg-red-100 rounded-full p-3 mb-4">
              <svg
                className="w-12 h-12 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLineCap="round"
                  strokeLineJoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-2">
              <Link
                href="/register"
                className="block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Register Again
              </Link>
              <Link
                href="/login"
                className="block text-purple-600 px-6 py-2 rounded-lg hover:bg-purple-50 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 2. Environment Variables

Add to your `.env.local` file in your Next.js project:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, update this to your production backend URL:
```env
NEXT_PUBLIC_API_URL=https://api.youruniverse.ai
```

### 3. Alternative: Server-Side Rendering (SSR) Version

If you prefer server-side rendering, create `app/verify-email/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

interface ApiResponse {
  success: boolean;
  data?: {
    message: string;
  };
  error?: {
    message: string;
  };
}

interface PageProps {
  searchParams: {
    token?: string;
  };
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-6">Verification token is missing.</p>
          <a
            href="/register"
            className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Register Again
          </a>
        </div>
      </div>
    );
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(
      `${backendUrl}/api/v1/auth/verify?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Important: Disable caching for this request
        cache: 'no-store',
      }
    );

    const data: ApiResponse = await response.json();

    if (data.success && response.ok) {
      // Redirect to login after successful verification
      redirect('/login?verified=true');
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="inline-block bg-red-100 rounded-full p-3 mb-4">
              <svg
                className="w-12 h-12 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLineCap="round"
                  strokeLineJoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">
              {data.error?.message || 'Verification failed. The token may be invalid or expired.'}
            </p>
            <div className="space-y-2">
              <a
                href="/register"
                className="block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Register Again
              </a>
              <a
                href="/login"
                className="block text-purple-600 px-6 py-2 rounded-lg hover:bg-purple-50 transition-colors"
              >
                Go to Login
              </a>
            </div>
          </div>
        </div>
      );
    }
  } catch (error) {
    console.error('Verification error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">
            An error occurred while verifying your email. Please try again later.
          </p>
          <a
            href="/login"
            className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }
}
```

### 4. Optional: Update Login Page to Show Success Message

If using SSR with redirect, update your login page to show a success message:

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setShowSuccess(true);
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  return (
    <div>
      {showSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Email verified successfully! You can now log in.
        </div>
      )}
      {/* Rest of your login form */}
    </div>
  );
}
```

## Testing

1. Register a new user through your registration endpoint
2. Check the email for the verification link
3. Click the link or navigate to: `http://localhost:3000/verify-email?token=YOUR_TOKEN`
4. The page should verify the email and show success/error messages

## Error Handling

The backend returns these error messages:
- `"Invalid verification token"` - Token doesn't exist or is wrong type
- `"Verification token expired"` - Token expired (24 hours)
- `"Token already used"` - Token was already used to verify email

Handle these appropriately in your UI to guide users.

## Notes

- Tokens expire after 24 hours
- Tokens can only be used once
- If token expires, users need to request a new verification email (if you implement that endpoint)
- The backend CORS is configured to allow `http://localhost:3000` by default

