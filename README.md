# DepositJudge

DepositJudge is a decentralized rental escrow protocol that uses GenLayer's AI consensus to subjectively analyze checkout conditions and automatically enforce fair security deposit distributions without human intermediaries.

## Why GenLayer is Required
Traditional blockchains cannot process subjective real-world evidence such as property rental photos or natural language checkout descriptions. DepositJudge leverages GenLayer's Intelligent Contracts (`nondet.web.render` and `nondet.exec_prompt`) to allow decentralized validator nodes to inspect public rental listings and evidence images, reaching consensus on whether damage occurred or if normal wear applies.

## Deployed Contract
- **Studio Network (Studionet) Address**: `0x3316cF283e8E9709c5DE8eA4dE0B4D3f4bfc46Db`
- **GenLayer Explorer**: [https://genlayer-explorer.vercel.app/address/0x3316cF283e8E9709c5DE8eA4dE0B4D3f4bfc46Db](https://genlayer-explorer.vercel.app/address/0x3316cF283e8E9709c5DE8eA4dE0B4D3f4bfc46Db)

## Live App
- Deploying to Vercel...

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
