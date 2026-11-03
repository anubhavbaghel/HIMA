import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("🔨 Building HIMA Standalone Windows Executable (.exe)...\n");

const distDir = path.join(rootDir, "dist");
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

const srcFile = path.join(rootDir, "src", "hima.mjs");
const bundledFile = path.join(distDir, "hima-bundled.cjs");
const seaBlob = path.join(distDir, "sea-prep.blob");
const seaConfigPath = path.join(distDir, "sea-config.json");
const targetExe = path.join(distDir, "hima.exe");
const rootExe = path.join(rootDir, "hima.exe");

// 1. Bundle all dependencies with esbuild
console.log("[1/4] 📦 Bundling HIMA script into single CJS module...");
execSync(`npx esbuild "${srcFile}" --bundle --platform=node --format=cjs --outfile="${bundledFile}"`, {
    cwd: rootDir,
    stdio: "inherit",
});

// 2. Generate SEA configuration
console.log("\n[2/4] ⚙️ Generating Node.js Single Executable configuration...");
const seaConfig = {
    main: bundledFile,
    output: seaBlob,
    disableExperimentalSEAWarning: true,
};
fs.writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2));
execSync(`node --experimental-sea-config "${seaConfigPath}"`, {
    cwd: rootDir,
    stdio: "inherit",
});

// 3. Copy host node binary
console.log("\n[3/4] 📋 Preparing executable binary base...");
fs.copyFileSync(process.execPath, targetExe);

// 4. Inject SEA blob using postject
console.log("\n[4/4] 💉 Injecting HIMA engine into hima.exe...");
execSync(
    `npx postject "${targetExe}" NODE_SEA_BLOB "${seaBlob}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`,
    { cwd: rootDir, stdio: "inherit" }
);

// Copy to root directory for convenient one-click launching
fs.copyFileSync(targetExe, rootExe);

console.log("\n✅ SUCCESS: Standalone executable created!");
console.log(`   Location: ${rootExe}`);
console.log(`   Run with: .\\hima.exe or double-click run.bat\n`);
