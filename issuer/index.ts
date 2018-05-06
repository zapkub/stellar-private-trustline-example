import * as fs from 'fs'
import * as path from 'path'
import 'isomorphic-fetch'

import * as StellarSdk from 'stellar-sdk'

export const DISTRIBUTER_KEY_FILE_NAME = 'dist.key'
export const ISSUERS_KEY_FILE_NAME = 'issuer.key'
export const SECRET_FOLDER_NAME = 'secrets'

if (!fs.existsSync(path.join(__dirname, SECRET_FOLDER_NAME))) {
  /**
   * Create folder for store
   * key file
   */
  console.log('[issuer] secret folder not exixts, create new folder')
  fs.mkdirSync(path.join(__dirname, SECRET_FOLDER_NAME))
}

const secretFolderPath = path.join(__dirname, SECRET_FOLDER_NAME)
const isIssuerExists = fs.existsSync(
  path.join(secretFolderPath, `/${ISSUERS_KEY_FILE_NAME}`)
)
const isDistributerExists = fs.existsSync(
  path.join(secretFolderPath, `/${DISTRIBUTER_KEY_FILE_NAME}`)
)

export async function getIssuerKey(): Promise<StellarSdk.Keypair> {
  return new Promise<StellarSdk.Keypair>((resolve, reject) => {
    fs.readFile(
      path.join(secretFolderPath, ISSUERS_KEY_FILE_NAME),
      (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(StellarSdk.Keypair.fromSecret(data.toString()))
      }
    )
  })
}

export async function getDistributorKey(): Promise<StellarSdk.Keypair> {
  return new Promise<StellarSdk.Keypair>((resolve, reject) => {
    fs.readFile(
      path.join(secretFolderPath, DISTRIBUTER_KEY_FILE_NAME),
      (err, data) => {
        if (err) {
          reject(err)
          return
        }
        resolve(StellarSdk.Keypair.fromSecret(data.toString()))
      }
    )
  })
}

/**
 * init asset agent account
 * return [issuer, distributor]
 */
export async function initIssuer(server: StellarSdk.Server) {
  /**
   * Generate issuer account
   * and distributer account
   * if not exists yet
   */

  /**
   * Read issuer key or recreate new one
   */
  let issuerKey: StellarSdk.Keypair
  if (!isIssuerExists) {
    console.warn(
      '[issuer] issuer account key not exists create new key pair....'
    )
    const p = StellarSdk.Keypair.random()
    fs.writeFileSync(
      path.join(secretFolderPath, ISSUERS_KEY_FILE_NAME),
      p.secret()
    )
    issuerKey = p

    /**
     * if development, will call for
     * testnet lumen from stellar bot
     */
    if (process.env.NODE_ENV === 'development') {
      /**
       * Check balance in issuer account
       * for use as transaction fee
       */
      await fetch(
        `https://friendbot.stellar.org/?addr=${issuerKey.publicKey()}`,
        {}
      )
      const account = await server.loadAccount(issuerKey.publicKey())
      account.balances.forEach((asset) => {
        console.log('[issuer] asset', asset)
      })
    }
  } else {
    const issuerSecret = fs
      .readFileSync(path.join(secretFolderPath, ISSUERS_KEY_FILE_NAME))
      .toString()
    issuerKey = StellarSdk.Keypair.fromSecret(issuerSecret)
  }

  /**
   * Do same process of
   * issuer key
   * with distributer
   */
  let distributerKey: StellarSdk.Keypair
  if (!isDistributerExists) {
    console.warn(
      '[distributor] distributor account key not exists create new key pair....'
    )
    const p = StellarSdk.Keypair.random()
    fs.writeFileSync(
      path.join(secretFolderPath, DISTRIBUTER_KEY_FILE_NAME),
      p.secret()
    )
    distributerKey = p
    if (process.env.NODE_ENV === 'development') {
      /**
       * Check balance in issuer account
       * for use as transaction fee
       */
      await fetch(
        `https://friendbot.stellar.org/?addr=${distributerKey.publicKey()}`,
        {}
      )
      const account = await server.loadAccount(distributerKey.publicKey())
      account.balances.forEach((asset) => {
        console.log('[issuer] distributor asset', asset)
      })
    }
  } else {
    const distributerSecret = fs
      .readFileSync(path.join(secretFolderPath, DISTRIBUTER_KEY_FILE_NAME))
      .toString()
    distributerKey = StellarSdk.Keypair.fromSecret(distributerSecret)
  }

  console.log('[key] key is loaded and ready to use')

  const issuerAccount = await server.loadAccount(issuerKey.publicKey())
  const distributorAccount = await server.loadAccount(
    distributerKey.publicKey()
  )
  return [issuerAccount, distributorAccount]
}
