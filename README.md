# DepositJudge

DepositJudge is a decentralized rental escrow protocol that uses GenLayer's AI consensus to subjectively analyze checkout conditions and automatically enforce fair security deposit distributions without human intermediaries.

## Why GenLayer is Required
Traditional blockchains cannot process subjective real-world evidence such as property rental photos or natural language checkout descriptions. DepositJudge leverages GenLayer's Intelligent Contracts (`nondet.web.render` and `nondet.exec_prompt`) to allow decentralized validator nodes to inspect public rental listings and evidence images, reaching consensus on whether damage occurred or if normal wear applies.

## Deployed Contract
- **Studio Network (Studionet) Address**: `0xbd7D2DE8C2aB169c26A22EE66ad1EDE8Cc846f72`
- **GenLayer Explorer**: [https://studio.genlayer.com/contracts/0xbd7D2DE8C2aB169c26A22EE66ad1EDE8Cc846f72](https://studio.genlayer.com/contracts/0xbd7D2DE8C2aB169c26A22EE66ad1EDE8Cc846f72)

## Live App
- **Vercel Production DApp**: [https://deposit-judge-genlayer.vercel.app](https://deposit-judge-genlayer.vercel.app)

## Local Development

### Requirements
- Node.js & npm
- GenLayer Studio Network RPC

### Run Frontend
```bash
cd frontend
npm install
npm run dev
```

### Build Frontend
```bash
cd frontend
npm run build
```
