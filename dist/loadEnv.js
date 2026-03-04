"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
let dotenvLoaded = false;
const envCandidates = [
    node_path_1.default.join(process.cwd(), ".env"),
    node_path_1.default.join(process.cwd(), "obaol-api", ".env"),
];
for (const candidatePath of envCandidates) {
    if (node_fs_1.default.existsSync(candidatePath)) {
        dotenv_1.default.config({ path: candidatePath });
        dotenvLoaded = true;
        break;
    }
}
if (dotenvLoaded) {
    // eslint-disable-next-line no-console
    console.log("Loaded environment variables from local .env");
}
else {
    // eslint-disable-next-line no-console
    console.warn("No .env file found in candidates:", envCandidates);
}
