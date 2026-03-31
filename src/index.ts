import 'dotenv/config';
import { createApp } from './app.js';

/**
 * Vercel Express entry: default export required by the platform.
 * @see https://vercel.com/docs/frameworks/backend/express
 */
const app = await createApp();
export default app;
