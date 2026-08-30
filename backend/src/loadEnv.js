import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  path.join(root, ".env"),
  path.join(process.cwd(), ".env"),
  path.join(root, "../.env"),
];

for (const file of candidates) {
  dotenv.config({ path: file, override: false });
}
// Prefer backend/.env when present
dotenv.config({ path: path.join(root, ".env"), override: true });
