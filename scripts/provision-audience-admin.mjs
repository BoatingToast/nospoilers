import { randomBytes } from 'node:crypto'
import { writeFile, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

try {
  process.loadEnvFile('.env')
} catch {
  /* Environment may be supplied by deployment. */
}
const db = new PrismaClient()
const email = 'emoon0108@gmail.com'
const argument = process.argv.indexOf('--credentials-file')
const credentialsPath = argument >= 0 ? process.argv[argument + 1] : null
let wroteCredentials = false
try {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { isAdmin: true } })
    console.log(
      'Administrator access granted to the existing owner account. Its password was not changed.',
    )
  } else {
    if (!credentialsPath)
      throw new Error(
        'For a new account, provide --credentials-file with a private path outside the repository. A password will be generated, never printed.',
      )
    const target = resolve(credentialsPath)
    const root = resolve('.')
    if (target === root || target.startsWith(root + '/'))
      throw new Error('Store the initial credentials outside the source repository.')
    const password = randomBytes(30).toString('base64url')
    const username = (await db.user.findUnique({
      where: { username: 'emoon0108' },
      select: { id: true },
    }))
      ? `emoon0108_${randomBytes(4).toString('hex')}`
      : 'emoon0108'
    await writeFile(
      target,
      `NoSpoilers initial administrator login\n\nEmail: ${email}\nUsername: ${username}\nPassword: ${password}\n\nKeep this file private. Delete it after storing the password in your password manager.\n`,
      { mode: 0o600, flag: 'wx' },
    )
    wroteCredentials = true
    await db.user.create({
      data: { email, username, password: await bcrypt.hash(password, 12), isAdmin: true },
    })
    console.log(`Administrator account created. Initial credentials saved privately to ${target}.`)
  }
} catch (error) {
  if (wroteCredentials && credentialsPath)
    await unlink(resolve(credentialsPath)).catch(() => undefined)
  console.error(
    error instanceof Error && !error.message.includes('prisma.')
      ? error.message
      : 'Administrator provisioning failed. Verify the database migration and connection.',
  )
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
