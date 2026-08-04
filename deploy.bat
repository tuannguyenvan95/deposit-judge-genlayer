cd c:\Users\Admin\Documents\genlayer\DepositJudge
git add .
git commit -m "Update contract address and enforce onchain flow"
git push
cd frontend
npx.cmd vercel deploy --prod --yes --env VITE_CONTRACT_ADDRESS=0x57aE0D2624bC0cb7184232BaC19C719E439F3C27
