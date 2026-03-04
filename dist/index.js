"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./loadEnv.js");
const mongoose_1 = __importDefault(require("mongoose"));
const app_js_1 = __importDefault(require("./app.js"));
const PORT = Number(process.env.PORT) || 3000;
function validateEnv() {
    const missing = [];
    if (!process.env.MONGO_URI && !process.env.MONGODB_URI && !process.env.MONGO_URL)
        missing.push("MONGO_URI");
    if (!process.env.API_KEY_SECRET)
        missing.push("API_KEY_SECRET");
    if (!process.env.JWT_SECRET && !process.env.DEV_JWT_SECRET)
        missing.push("JWT_SECRET");
    if (!process.env.GOOGLE_CLIENT_ID)
        missing.push("GOOGLE_CLIENT_ID");
    if (!process.env.GOOGLE_CLIENT_SECRET)
        missing.push("GOOGLE_CLIENT_SECRET");
    if (missing.length > 0) {
        // eslint-disable-next-line no-console
        console.error("CRITICAL: Missing required environment variables:", missing.join(", "));
        // eslint-disable-next-line no-console
        console.error("The application will likely crash or malfunction.");
    }
    // BASE_URL has a fallback in passport.js, so we just warn here
    if (!process.env.BASE_URL) {
        // eslint-disable-next-line no-console
        console.warn("WARNING: BASE_URL is missing. Falling back to default.");
    }
}
validateEnv();
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL || "";
let server;
async function start() {
    try {
        // eslint-disable-next-line no-console
        console.log(`Starting server in ${process.env.NODE_ENV || "development"} mode...`);
        await mongoose_1.default.connect(MONGO_URI);
        // eslint-disable-next-line no-console
        console.log("MongoDB connected.");
        server = app_js_1.default.listen(PORT, "0.0.0.0", () => {
            // eslint-disable-next-line no-console
            console.log(`obaol-api listening on port ${PORT}`);
            // eslint-disable-next-line no-console
            console.log(`Health check available at: http://localhost:${PORT}/health`);
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
