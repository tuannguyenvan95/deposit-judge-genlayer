cd c:\Users\Admin\Documents\genlayer\DepositJudge
git add .
git commit -m "Update contract address and enforce onchain flow"
git push
cd frontend
npx.cmd vercel deploy --prod --yes --env VITE_CONTRACT_ADDRESS=0x18f8755a9CDBe8dF39080358ae1b66d94be0F194
