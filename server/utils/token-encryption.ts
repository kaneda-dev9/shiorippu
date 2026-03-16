import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

/** 暗号化キーを取得（環境変数から32バイトのhex文字列） */
function getEncryptionKey(): Buffer {
  const config = useRuntimeConfig()
  const key = config.tokenEncryptionKey

  if (!key || key.length !== 64) {
    throw new Error('NUXT_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }

  return Buffer.from(key, 'hex')
}

/** AES-256-GCM でトークンを暗号化 */
export function encryptToken(plainText: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // iv:authTag:encrypted の形式で返す
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/** AES-256-GCM で暗号化されたトークンを復号 */
export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey()
  const parts = encrypted.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format')
  }

  const iv = Buffer.from(parts[0]!, 'hex')
  const authTag = Buffer.from(parts[1]!, 'hex')
  const encryptedText = parts[2]!

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
