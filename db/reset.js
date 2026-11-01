// npm run db:reset — deletes the database file (and WAL files) so db:setup can rebuild it.
import fs from 'node:fs'
import { DB_PATH } from './client.js'

for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
  try {
    fs.rmSync(f, { force: true })
  } catch (e) {
    console.error(`✖ Could not delete ${f}. Stop the app (npm run dev) first, then try again.\n  ${e.message}`)
    process.exit(1)
  }
}
console.log(`🗑  Deleted ${DB_PATH}`)
