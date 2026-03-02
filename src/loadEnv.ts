import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

let dotenvLoaded = false;
const envCandidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "obaol-api", ".env"),
];

for (const candidatePath of envCandidates) {
    if (fs.existsSync(candidatePath)) {
        dotenv.config({ path: candidatePath });
        dotenvLoaded = true;
        break;
    }
}

if (dotenvLoaded) {
    // eslint-disable-next-line no-console
    console.log("Loaded environment variables from local .env");
} else {
    // eslint-disable-next-line no-console
    console.warn("No .env file found in candidates:", envCandidates);
}
