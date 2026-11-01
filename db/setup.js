// npm run db:setup: creates the tables and loads sample data. Safe to run again.
import { closeDb, dbLabel, runSqlFiles } from './client.js'

try {
  const counts = await runSqlFiles(['db/schema.sql', 'db/seed.sql'])
  console.log(`\nGardenCraft database ready at ${dbLabel()}\n`)
  console.table(counts)
} catch (e) {
  console.error(`\nCould not set up the database at ${dbLabel()}\n  ${e.cause?.message || e.message}\n`)
  process.exitCode = 1
} finally {
  await closeDb()
}
