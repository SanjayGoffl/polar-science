// Removes uploaded field photos (keeps the .gitkeep). Used by `npm run db:reset`.
import { readdirSync, rmSync } from "node:fs";

for (const f of readdirSync("data/uploads")) if (f !== ".gitkeep") rmSync(`data/uploads/${f}`);
