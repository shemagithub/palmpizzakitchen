import "../loadEnv.js";
import { ensureSchema } from "../ensureSchema.js";

ensureSchema()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("DB init failed:", err.message);
    process.exit(1);
  });
