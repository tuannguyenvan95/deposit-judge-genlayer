import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0xAf4f941bFCBf2B715dF232dE24E9e222709A142F";

export interface EscrowItem {
  id: string;
  landlord: string;
  tenant: string;
  deposit_amount: string;
  status: string;
  tenant_listing_url: string;
  tenant_description: string;
  tenant_evidence_url: string;
  landlord_listing_url: string;
  landlord_description: string;
  landlord_evidence_url: string;
  verdict: string;
  damage_percent: string;
  reason: string;
  confidence: string;
  payout_ready_at: string;
}

export const getClient = async () => {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask or an EIP-1193 compatible wallet is required');
  }
  const accounts = (await (window as any).ethereum.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error('No connected wallet account detected');
  }
  return createClient({
    chain: studionet,
    account: accounts[0] as `0x${string}`,
  });
};

// 1. READ REAL ON-CHAIN DATA (NO MOCKING)
export const fetchAllEscrows = async (): Promise<EscrowItem[]> => {
  const client = await getClient();
  const raw = await client.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName: 'get_all_escrows',
    args: [],
  });

  if (!raw || typeof raw !== 'string') {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse get_all_escrows response:", err);
    return [];
  }
};

// 2. EXECUTE CONTRACT WRITE & WAIT FOR RECEIPT
export const executeContractWrite = async (
  functionName: string,
  args: any[],
  value: bigint = BigInt(0)
): Promise<EscrowItem[]> => {
  const client = await getClient();

  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName,
    args,
    value,
  });

  if (!hash || !hash.startsWith('0x')) {
    throw new Error('Invalid transaction hash received from wallet');
  }

  const receipt = await client.waitForTransactionReceipt({ hash, retries: 45 });
  const recAny = receipt as any;
  if (!receipt || (recAny?.txExecutionResult !== undefined && recAny?.txExecutionResult !== 1 && recAny?.txExecutionResult !== 0)) {
    throw new Error(`Transaction failed or reverted on-chain (Status: ${recAny?.statusName || recAny?.status || 'UNKNOWN'})`);
  }

  // Read confirmed on-chain state back
  return await fetchAllEscrows();
};
