require('dotenv').config({})
import * as StellarSdk from 'stellar-sdk'
import { initIssuer, getIssuerKey, getDistributorKey } from './issuer'
import { createWalllet, getWalletKey } from './wallet'

StellarSdk.Network.useTestNetwork()
const server = new StellarSdk.Server('https://horizon-testnet.stellar.org')

async function run() {
  const [issuer, distributor] = await initIssuer(server)
  /**
   * Issuer, Distributor ready to use
   */

  // Create new Custom Asset in Stellar network
  // using issuerKey
  const issuerKey = await getIssuerKey()
  const { ASSET_NAME } = process.env
  if (ASSET_NAME) {
    const AppAsset = new StellarSdk.Asset(ASSET_NAME, issuerKey.publicKey())

    /**
     * Lock our asset by setting an option
     * AUTHORIZATION REQUIRED flag
     * to issuer account
     */

    // Create new transaction

    const transaction = new StellarSdk.TransactionBuilder(issuer)
      .addOperation(
        StellarSdk.Operation.setOptions({
          setFlags: StellarSdk.AuthRequiredFlag
          // clearFlags: StellarSdk.AuthRequiredFlag
        })
      )
      .build()

    // sign transaction
    transaction.sign(issuerKey)

    // submit to server
    await server.submitTransaction(transaction)
    console.log('[main] asset has been enable AUTHORIZATION_REQUIRED flag')

    /**
     * Change distributor trustline to trust
     * issuer
     */

    const changeTrustToIssuerTransaction = new StellarSdk.TransactionBuilder(
      distributor
    )
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: AppAsset
        })
      )
      .build()

    const distributorKey = await getDistributorKey()
    changeTrustToIssuerTransaction.sign(distributorKey)
    try {
      await server.submitTransaction(changeTrustToIssuerTransaction)
    } catch (e) {
      console.log(distributorKey.publicKey())
      console.dir(e)
    }
    console.log('[main] distributor changed trustline to issuer')
    /**
     * Allow distributor to hold
     * our custom asset
     */

    const allowTrustTransacton = new StellarSdk.TransactionBuilder(issuer)
      .addOperation(
        StellarSdk.Operation.allowTrust({
          assetCode: ASSET_NAME,
          authorize: true,
          trustor: distributor.id
        })
      )
      .build()
    allowTrustTransacton.sign(issuerKey)

    await server.submitTransaction(allowTrustTransacton)
    console.log('[main] issuer allow trust for distributor')

    /**
     * Issuing Asset to distributor
     */

    const issuingAssetToDistributorTransaction = new StellarSdk.TransactionBuilder(
      issuer
    )
      .addOperation(
        StellarSdk.Operation.payment({
          asset: AppAsset,
          amount: '300',
          destination: distributorKey.publicKey()
        })
      )
      .build()
    issuingAssetToDistributorTransaction.sign(issuerKey)

    await server.submitTransaction(issuingAssetToDistributorTransaction)

    distributor.balances.forEach((asset) => {
      console.log(asset)
    })

    /**
     * Customer init wallet and account
     * and then try to add trustline without
     * authorization
     */

    const wallet = await createWalllet(server)

    if (!wallet) {
      throw new Error('[main] wallet is unavaliable')
    }
    const walletChangeTrustTransaction = new StellarSdk.TransactionBuilder(
      wallet
    )
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: AppAsset
        })
      )
      .build()

    const walletKey = await getWalletKey()
    walletChangeTrustTransaction.sign(walletKey)

    try {
      await server.submitTransaction(walletChangeTrustTransaction)
      console.log('[main] wallet change trust done')
    } catch (e) {
      console.error(e)
    }

    /**
     * Try to send asset to customer
     * Distributor will failed at the first try to send
     * some asset to wallet
     */

    const distributorPaymentToCustomerTransaction = new StellarSdk.TransactionBuilder(
      distributor
    )
      .addOperation(
        StellarSdk.Operation.payment({
          asset: AppAsset,
          amount: '20',
          destination: walletKey.publicKey()
        })
      )
      .build()

    distributorPaymentToCustomerTransaction.sign(distributorKey)

    try {
      await server.submitTransaction(distributorPaymentToCustomerTransaction)
    } catch (e) {
      // transaction will failed
      // here resp with 400 operation
      console.log(e)
    }

    /**
     * To allow wallet to hold our asset
     * issuer should
     * AllowTrust for customer wallet key
     */

    const issuerAllowTrustWalletKeyTransaction = new StellarSdk.TransactionBuilder(
    issuer)
    .addOperation(
      StellarSdk.Operation.allowTrust({
        assetCode: AppAsset.code,
        authorize: true,
        trustor: wallet.id
      })
    )
    .build()

    issuerAllowTrustWalletKeyTransaction.sign(issuerKey)

    await server.submitTransaction(issuerAllowTrustWalletKeyTransaction)
    console.log(`[main] issuer allow trust for key ${wallet.id} done `)

    // and then ask distributor to
    // try to send Asset to wallet again
    const distributorSecondAttemptPaymentToCustomerTransaction = new StellarSdk.TransactionBuilder(
      distributor
    )
      .addOperation(
        StellarSdk.Operation.payment({
          asset: AppAsset,
          amount: '20',
          destination: walletKey.publicKey()
        })
      )
      .build()

    distributorSecondAttemptPaymentToCustomerTransaction.sign(distributorKey)
    await server.submitTransaction(distributorSecondAttemptPaymentToCustomerTransaction)

    console.log('[main] customer already receive asset')

  } else {
    throw new Error('[main] Asset name not found (process.env.ASSET_NAME)')
  }
}

run()
