cd c:\Users\Admin\Documents\genlayer\DepositJudge
git add .
git commit -m "Update contract address and enforce onchain flow"
git push
cd frontend
npx.cmd vercel deploy --prod --yes --env VITE_CONTRACT_ADDRESS=0x839828eC875dC7c1EDFEb1CF5b595bBCae4911dD
