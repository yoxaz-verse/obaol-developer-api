"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_js_1 = __importDefault(require("./app.js"));
let dotenvLoaded = false;
const localEnvPath = node_path_1.default.join(process.cwd(), ".env");
if (node_fs_1.default.existsSync(localEnvPath)) {
    // Load local env file only when present (dev/local workflows).
    // Production should pass environment variables directly.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("dotenv").config();
    dotenvLoaded = true;
}
if (dotenvLoaded) {
    // eslint-disable-next-line no-console
    console.log("Loaded environment variables from local .env");
}
const PORT = Number(process.env.PORT) || 3000;
const MONGO_URI = process.env.MONGO_URI;
const API_KEY_SECRET = process.env.API_KEY_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL;
if (!MONGO_URI) {
    // eslint-disable-next-line no-console
    console.error("MONGO_URI is missing.");
    process.exit(1);
}
if (!API_KEY_SECRET) {
    // eslint-disable-next-line no-console
    console.error("API_KEY_SECRET is missing.");
    process.exit(1);
}
if (!JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.error("JWT_SECRET is missing.");
    process.exit(1);
}
if (!GOOGLE_CLIENT_ID) {
    // eslint-disable-next-line no-console
    console.error("GOOGLE_CLIENT_ID is missing.");
    process.exit(1);
}
if (!GOOGLE_CLIENT_SECRET) {
    // eslint-disable-next-line no-console
    console.error("GOOGLE_CLIENT_SECRET is missing.");
    process.exit(1);
}
if (!BASE_URL) {
    // eslint-disable-next-line no-console
    console.error("BASE_URL is missing.");
    process.exit(1);
}
let server;
async function start() {
    try {
        await mongoose_1.default.connect("mongodb+srv://yakobyte:AU5ZldseqnrEtMUK@obaol-cluster.oq0ij.mongodb.net/oboal");
        // eslint-disable-next-line no-console
        console.log("MongoDB connected.");
        server = app_js_1.default.listen(PORT, "0.0.0.0", () => {
            // eslint-disable-next-line no-console
            console.log(`obaol-api listening on port ${PORT}`);
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // eslint-disable-next-line no-console
        console.error("Server startup failed:", message);
        process.exit(1);
    }
}
async function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`${signal} received. Shutting down...`);
    try {
        if (server) {
            await new Promise((resolve) => {
                server?.close(() => resolve());
            });
        }
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
    catch (error) {
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
