// npm run db:reset: deletes ALL GardenCraft tables and data so db:setup can rebuild them.
// Asks for confirmation because the same DATABASE_URL may point at the live site's database.
import readline from 'node:readline/promises'
import { closeDb, dbLabel, dropAll } from './client.js'

const target = dbLabel()
let ok = process.argv.includes('--yes')
if (!ok && process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`This deletes ALL data in ${target}. Type RESET to continue: `)
  rl.close()
  ok = answer.trim() === 'RESET'
}
if (!ok) {
  console.log('Reset cancelled. Nothing was deleted.')
  process.exit(1)
}
try {
  await dropAll()
  console.log(`Dropped all GardenCraft tables in ${target}`)
} catch (e) {
  console.error(`Could not reset ${target}: ${e.cause?.message || e.message}`)
  process.exitCode = 1
} finally {
  await closeDb()
}
