/**
 * @file Server entry point.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = Number(process.env.PORT || 3000);
const MONGO_URI = process.env.MONGO_URI;
const API_KEY_SECRET = process.env.API_KEY_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL;

if (!MONGO_URI) {
  // eslint-disable-next-line no-console
  console.error('MONGO_URI is missing.');
  process.exit(1);
}

if (!API_KEY_SECRET) {
  // eslint-disable-next-line no-console
  console.error('API_KEY_SECRET is missing.');
  process.exit(1);
}

if (!JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error('JWT_SECRET is missing.');
  process.exit(1);
}

if (!GOOGLE_CLIENT_ID) {
  // eslint-disable-next-line no-console
  console.error('GOOGLE_CLIENT_ID is missing.');
  process.exit(1);
}

if (!GOOGLE_CLIENT_SECRET) {
  // eslint-disable-next-line no-console
  console.error('GOOGLE_CLIENT_SECRET is missing.');
  process.exit(1);
}

if (!BASE_URL) {
  // eslint-disable-next-line no-console
  console.error('BASE_URL is missing.');
  process.exit(1);
}

let server;

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    // eslint-disable-next-line no-console
    console.log('MongoDB connected.');

    server = app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`obaol-api listening on port ${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Server startup failed:', error?.message || error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`${signal} received. Shutting down...`);
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Shutdown error:', error?.message || error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
