import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// .envファイルからDATABASE_URLを読み込み
const envPath = resolve(__dirname, '../../.env')
try {
  const envFile = readFileSync(envPath, 'utf-8')
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match && !process.env[match[1]!.trim()]) {
      process.env[match[1]!.trim()] = match[2]!.trim()
    }
  }
}
catch {
  // .envが無くても環境変数で直接設定されていればOK
}
