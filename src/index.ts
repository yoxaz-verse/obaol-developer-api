import "./loadEnv.js";
import mongoose from "mongoose";
import app from "./app.js";

const PORT = Number(process.env.PORT) || 3000;
const rawMongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL;

function requireEnv(value: string | undefined, message: string): string {
  if (!value) {
    // eslint-disable-next-line no-console
    console.error(message);
    process.exit(1);
  }
  return value;
}

const MONGO_URI = requireEnv(
  rawMongoUri,
  "Mongo URI is missing. Set one of: MONGO_URI, MONGODB_URI, or MONGO_URL."
);
const API_KEY_SECRET = requireEnv(
  process.env.API_KEY_SECRET,
  "API_KEY_SECRET is missing."
);
const JWT_SECRET = requireEnv(
  process.env.JWT_SECRET || process.env.DEV_JWT_SECRET,
  "JWT_SECRET is missing."
);
const GOOGLE_CLIENT_ID = requireEnv(
  process.env.GOOGLE_CLIENT_ID,
  "GOOGLE_CLIENT_ID is missing."
);
const GOOGLE_CLIENT_SECRET = requireEnv(
  process.env.GOOGLE_CLIENT_SECRET,
  "GOOGLE_CLIENT_SECRET is missing."
);
const BASE_URL = requireEnv(process.env.BASE_URL, "BASE_URL is missing.");

let server: import("node:http").Server | undefined;

async function start(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    // eslint-disable-next-line no-console
    console.log("MongoDB connected.");

    server = app.listen(PORT, "0.0.0.0", () => {
      // eslint-disable-next-line no-console
      console.log(`obaol-api listening on port ${PORT}`);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error("Server startup failed:", message);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`${signal} received. Shutting down...`);
  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close(() => resolve());
      });
    }
    await mongoose.connection.close();
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error("Shutdown error:", message);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start();
