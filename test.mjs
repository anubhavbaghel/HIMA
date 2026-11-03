// Quick dry-run verification test for HIMA engine
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== Testing Standalone HIMA Engine ===\n");

const himaScript = path.join(__dirname, "src", "hima.mjs");
const child = spawn(process.execPath, [
    himaScript,
    "--topic",
    "Why slow mornings are replacing 5 AM hustle culture",
    "--dry-run"
], {
    cwd: __dirname,
    stdio: "inherit",
    env: process.env,
});

child.on("exit", (code) => {
    if (code === 0) {
        console.log("\n✅ HIMA dry-run test passed successfully!");
    } else {
        console.error(`\n❌ HIMA test exited with code ${code}`);
    }
});
