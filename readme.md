# Stellar Private Trustline Example
This repository show how to implement stellar network blockchain custom asset and how to make it Authenticable to hold the asset

# What does it work?
- Create new Issuer and Distributor key
- Create new Custom Asset from `ASSET_NAME` in env
- Set Issuer option to `AuthRequired`
- Change Distributor Trustline to Issuer and `AllowTrust` for Distributor
- Send CustomAsset to Distributor
- Customer `changeTrust` to issuer asset
- Distributor try to send asset to Customer
- it will failed
- Issuer `AllowTrust` to Customer
- Distributor try to send asset again and complete

# Development
- nodejs 9.0+
- clone this project
- create new `.env` from `.env.example`
- provide `ASSET_NAME`
```
## after clone this project
$ npm install

// compile typescript
$ npm run watch

// start app
$ npm run dev

```
