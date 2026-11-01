// npm run db:setup — creates the tables and loads sample data. Safe to run again.
import { DB_PATH, runSqlFiles } from './client.js'

try {
  const counts = runSqlFiles(['db/schema.sql', 'db/seed.sql'])
  console.log(`\n🌱 GardenCraft database ready at ${DB_PATH}\n`)
  console.table(counts)
} catch (e) {
  console.error(`\n✖ Could not set up the database at ${DB_PATH}\n  ${e.message}\n`)
  process.exit(1)
}
