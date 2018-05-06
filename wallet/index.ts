import * as fs from 'fs'
import * as path from 'path'
import { Keypair, Account, Server, AccountResponse } from 'stellar-sdk'

export const SECRET_FOLDER_NAME = 'secrets'
export const SECRET_KEY_NAME = 'key'
if (!fs.existsSync(path.join(__dirname, SECRET_FOLDER_NAME))) {
  /**
   * Create folder for store
   * key file
   */
  console.log('[issuer] secret folder not exixts, create new folder')
  fs.mkdirSync(path.join(__dirname, SECRET_FOLDER_NAME))
}

let walletKey: Keypair
const keyPath = path.join(__dirname, SECRET_FOLDER_NAME, SECRET_KEY_NAME)
if (!fs.existsSync(keyPath)) {
  const k = Keypair.random()
  fs.writeFileSync(keyPath, k.secret())
  walletKey = k
} else {
  const k = fs.readFileSync(keyPath).toString()
  walletKey = Keypair.fromSecret(k)
}

export async function getWalletKey() {
  return walletKey
}

export async function createWalllet(server: Server): Promise<AccountResponse | undefined> {
  let walletAccount: AccountResponse
  try {
    walletAccount = await server.loadAccount(walletKey.publicKey())
    return walletAccount
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[wallet] cannot load account, try to send some lumen to account')
      await fetch(
        `https://friendbot.stellar.org/?addr=${walletKey.publicKey()}`,
        {}
      )
      console.log('[wallet] done!')
      walletAccount = await server.loadAccount(walletKey.publicKey())
      return walletAccount
    } else {
      console.warn(
        `[wallet] wallet is not activate... please transfer some Lumen to ${walletKey.publicKey()}`
      )
      return undefined
    }
  }

}
