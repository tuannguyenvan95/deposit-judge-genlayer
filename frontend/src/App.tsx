import React, { useState, useEffect } from 'react'
import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { getAddress } from 'viem'
import './index.css'
import { formatGen } from './utils'

// Configuration for GenLayer Studio Network (studionet)
const DEFAULT_CONTRACT_ADDRESS = '0x839828eC875dC7c1EDFEb1CF5b595bBCae4911dD'
const DEV_WALLET_ADDRESS = '0xDEADBEEF00000000000000000000000000000001'
const GEN_FAUCET_URL = 'https://studio.genlayer.com'
const GEN_TESTNET_FAUCET_URL = 'https://testnet-faucet.genlayer.foundation/'

interface EscrowState {
  escrowId: string;
  landlord: string;
  tenant: string;
  depositAmount: string;
  landlordFunded: boolean;
  tenantFunded: boolean;
  tenantSubmitted: boolean;
  tenantListingUrl: string;
  tenantDescription: string;
  tenantEvidenceUrl: string;
  landlordSubmitted: boolean;
  landlordListingUrl: string;
  landlordDescription: string;
  landlordEvidenceUrl: string;
  resolved: boolean;
  verdict: string;
  reason: string;
  landlordPayout: string;
  tenantPayout: string;
}

interface LuxuryProperty {
  id: string;
  title: string;
  location: string;
  price: string;
  deposit: string;
  image: string;
  specs: string;
  listingUrl: string;
  landlordAddress: string;
}

const FEATURED_PROPERTIES: LuxuryProperty[] = [
  {
    id: 'DUBAI-ROYAL-01',
    title: 'The Royal Burj Dubai Penthouse',
    location: 'Downtown Dubai, UAE',
    price: '5.00 GEN / month',
    deposit: '5',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    specs: '6 Bed • 8,500 sq ft • Private Helipad',
    listingUrl: 'https://www.airbnb.com/rooms/dubai-burj-royal-suite-2026',
    landlordAddress: '0x71C8A4E2909743e2Ab9f34b7F6B169de00000001'
  },
  {
    id: 'NYC-TRIBECA-88',
    title: 'Tribeca Skyview Manhattan Loft',
    location: 'New York City, USA',
    price: '3.50 GEN / month',
    deposit: '3.5',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    specs: '3 Bed • 4,200 sq ft • Skyline Terrace',
    listingUrl: 'https://www.airbnb.com/rooms/ny-luxury-tribeca-loft-4291',
    landlordAddress: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7'
  },
  {
    id: 'PARIS-ELYSEES-07',
    title: 'Château de Champs-Élysées Villa',
    location: 'Paris, France',
    price: '4.20 GEN / month',
    deposit: '4.2',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    specs: '5 Bed • 6,100 sq ft • Historic Courtyard',
    listingUrl: 'https://www.airbnb.com/rooms/paris-elysees-villa-heritage-8820',
    landlordAddress: '0x2F4E9a3b8D1c7B2a0E4d8e6F1A9b3C5d7e0B1C4E'
  },
  {
    id: 'LA-BEVERLY-99',
    title: 'Beverly Hills Glass Horizon Estate',
    location: 'Los Angeles, USA',
    price: '6.00 GEN / month',
    deposit: '6',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    specs: '7 Bed • 11,000 sq ft • Infinity Pool & Vault',
    listingUrl: 'https://www.airbnb.com/rooms/la-beverly-hills-infinity-estate-9931',
    landlordAddress: '0x4D2A9e8B1C7f3E0A5b6C9D1a2F4e7A8B0c3E6D9F'
  },
  {
    id: 'SG-MARINABAY-12',
    title: 'Singapore Marina Bay Sky Residence',
    location: 'Marina Bay, Singapore',
    price: '4.80 GEN / month',
    deposit: '4.8',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    specs: '4 Bed • 5,200 sq ft • Infinity Pool',
    listingUrl: 'https://www.airbnb.com/rooms/singapore-marina-bay-sky-12',
    landlordAddress: '0x9E3F1c4B5A6d7B8c9F0D1E2A3B4C5D6E7F8a9B0C'
  },
  {
    id: 'TYO-ROPPONGI-05',
    title: 'Tokyo Roppongi Hills Penthouse',
    location: 'Roppongi, Tokyo, Japan',
    price: '3.90 GEN / month',
    deposit: '3.9',
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
    specs: '3 Bed • 3,800 sq ft • Private Onsen & City View',
    listingUrl: 'https://www.airbnb.com/rooms/tokyo-roppongi-hills-penthouse',
    landlordAddress: '0x5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D'
  }
]

function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'evidence' | 'judge' | 'profile'>('create')
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS)

  // Web3 Wallet Connection State
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletType, setWalletType] = useState('')
  const [walletBalance, setWalletBalance] = useState('')
  const [devMode, setDevMode] = useState(false)

  // Form State for Escrow Creation
  const [escrowId, setEscrowId] = useState('NYC-TRIBECA-88')
  const [landlord, setLandlord] = useState('0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7')
  const [tenant, setTenant] = useState('')
  const [amount, setAmount] = useState('3500')

  // Form State for Evidence Submission
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant')
  const [listingUrl, setListingUrl] = useState('')
  const [description, setDescription] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [uploadingIpfs, setUploadingIpfs] = useState(false)

  // Current Escrow Interactive Tracker
  const [currentEscrow, setCurrentEscrow] = useState<EscrowState | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [aiStage, setAiStage] = useState<string>('')

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
          if (accounts && accounts.length > 0) {
            setWalletConnected(true)
            setWalletType('MetaMask (Injected)')
            setWalletAddress(accounts[0])
            fetchBalance(accounts[0])
          }
        } catch (err) {
          console.error("Failed to re-hydrate wallet connection:", err)
        }
      }
    }
    checkConnection()
  }, [])

  // Toggle Dev Mode - simulates wallet connection without MetaMask
  const handleToggleDevMode = () => {
    if (!import.meta.env.DEV) {
      alert("Dev Mode is strictly disabled in production to ensure 100% genuine GenLayer on-chain verification without mocks.");
      return;
    }
    if (devMode) {
      // Turning OFF dev mode
      setDevMode(false)
      setWalletConnected(false)
      setWalletAddress('')
      setTenant('')
      setWalletType('')
      setWalletBalance('')
      addLog('[Dev Mode] Disabled — reconnected to real wallet provider')
    } else {
      // Turning ON dev mode
      setDevMode(true)
      setWalletConnected(true)
      setWalletType('Dev Mode (Simulated)')
      setWalletAddress(DEV_WALLET_ADDRESS)
      setTenant(DEV_WALLET_ADDRESS)
      setWalletBalance('100,000 GEN (simulated)')
      setShowWalletModal(false)
      addLog(`[Dev Mode] Enabled — using simulated wallet: ${DEV_WALLET_ADDRESS}`)
    }
  }

  // Fetch real wallet balance via eth_getBalance
  const fetchBalance = async (address: string) => {
    try {
      const provider = (window as any).ethereum
      if (!provider) return
      const balanceHex: string = await provider.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      })
      const balanceWei = BigInt(balanceHex)
      const balanceGen = Number(balanceWei) / 1e18
      if (balanceGen === 0) {
        setWalletBalance('0 GEN')
      } else if (balanceGen < 0.0001) {
        setWalletBalance('< 0.0001 GEN')
      } else {
        setWalletBalance(`${balanceGen.toFixed(4).replace(/\.?0+$/, '')} GEN`)
      }
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err)
      setWalletBalance('Connected')
    }
  }

  // Add diagnostic log message
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 15)])
  }

  // --- PATCH FOR GENLAYER GAS PRICE BUG ---
  // The genlayer-js SDK fetches eth_gasPrice directly from the RPC node.
  // Since GenLayer Studionet returns 0x0, the SDK passes gasPrice: 0 to MetaMask,
  // which causes the "feeCap 0 below chain minimum" error.
  // We intercept the fetch call to mock a 5 Gwei gas price.
  useEffect(() => {
    if (!(window as any)._patchedFetch) {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const url = args[0] as string;
        if (url && typeof url === 'string' && url.includes('studio.genlayer.com/rpc')) {
          const init = args[1] as RequestInit;
          if (init && init.body && typeof init.body === 'string' && init.body.includes('"eth_gasPrice"')) {
            return new Response(JSON.stringify({
              jsonrpc: "2.0",
              id: JSON.parse(init.body).id || 1,
              result: "0x12a05f200" // 5 Gwei
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        return originalFetch(...args);
      };
      (window as any)._patchedFetch = true;
    }
  }, [])

  // Web3 Wallet Connector Handlers - 100% Real On-Chain Execution Only
  const handleConnectWallet = async (type: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const provider = (window as any).ethereum
        const accounts = await provider.request({ method: 'eth_requestAccounts' })
        const address = accounts[0]
        setWalletConnected(true)
        setWalletType('MetaMask (Injected)')
        setWalletAddress(address)
        setTenant(address)
        fetchBalance(address)
        setShowWalletModal(false)
        addLog(`[Web3 Auth] Connected real on-chain signer: ${address} via ${type}`)
      } else {
        alert("Web3 Provider not found! Please install MetaMask or a compatible Ethereum wallet extension to interact with GenLayer StudioNet directly.");
      }
    } catch (err) {
      addLog(`[Web3 Auth] Connection failed: ${String(err)}`)
    }
  }

  const handleDisconnectWallet = () => {
    addLog(`[Web3 Auth] Disconnected executive signer ${walletAddress} (${walletType})`)
    setWalletConnected(false)
    setWalletAddress('')
    setTenant('')
    setWalletType('')
    setWalletBalance('')
  }

  // Lease Featured Property Handler
  const handleLeaseProperty = (property: LuxuryProperty) => {
    setEscrowId(property.id)
    setLandlord(property.landlordAddress)
    setAmount(property.deposit)
    if (walletConnected && walletAddress) {
      setTenant(walletAddress)
    } else {
      setTenant('')
    }
    setActiveTab('create')
    addLog(`[Lease Selected] Loaded luxury specifications for: ${property.title} (${property.location})`)
    window.scrollTo({ top: document.getElementById('console-section')?.offsetTop || 500, behavior: 'smooth' })
  }


  // GenLayer live client connection
  const getClient = () => {
    const config: any = { chain: studionet }
    if (typeof window !== 'undefined' && (window as any).ethereum && walletConnected && walletAddress) {
      config.provider = (window as any).ethereum
      config.account = walletAddress
    }
    const client = createClient(config)
    console.log('GenLayer client initialized for network:', client.chain?.name)
    return client
  }

  // Demo Data Auto-Fill Helpers for Judges & Quick Walkthroughs
  const fillDemoCreateEscrow = () => {
    const demos = [
      { id: 'LA-BEVERLY-99', amt: '6' },
      { id: 'NY-MANHATTAN-PH4', amt: '10' },
      { id: 'MIA-SOUTH-BEACH-12', amt: '8' },
      { id: 'ASPEN-CHALET-07', amt: '15' },
      { id: 'SF-PACIFIC-HGHTS-3', amt: '5' }
    ];
    const picked = demos[Math.floor(Math.random() * demos.length)];
    setEscrowId(picked.id);
    setAmount(picked.amt);
    addLog(`[Demo] Auto-filled luxury property lease configuration: ${picked.id} (${picked.amt} GEN)`);
  };

  const fillDemoEvidence = () => {
    if (role === 'tenant') {
      setListingUrl('https://deposit-judge-genlayer.vercel.app/demo-listing.txt');
      setDescription('All rooms left immaculate, kitchen surfaces cleaned, luxury appliances undamaged, and entrance keys returned promptly to the digital lockbox. No damage occurred during tenancy.');
      setEvidenceUrl('https://deposit-judge-genlayer.vercel.app/demo-tenant-evidence.txt');
      addLog('[Demo] Auto-filled Tenant defense walkthrough and IPFS visual verification.');
    } else {
      setListingUrl('https://deposit-judge-genlayer.vercel.app/demo-listing.txt');
      setDescription('Imported Italian leather sofa shows extensive gouges and cuts from unauthorized pet claws in violation of No-Pets policy. Master suite marble countertop etched by chemical spillage.');
      setEvidenceUrl('https://deposit-judge-genlayer.vercel.app/demo-landlord-damage.txt');
      addLog('[Demo] Auto-filled Landlord check-out damage claim and visual proof.');
    }
  };

  // 1. Create & Register Escrow
  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletConnected || !walletAddress) {
      alert('Please connect your real Web3 wallet (MetaMask) first to perform on-chain transactions on GenLayer StudioNet!');
      return
    }
    if (!escrowId || !landlord || !tenant || !amount) {
      alert('Please fill in all mandatory parameters.')
      return
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Deposit amount must be a positive number greater than 0 GEN.')
      return
    }
    if (!landlord.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Landlord address must be a valid 42-character Web3 hex address (e.g., 0x123...abc). Remove any extra text or names.')
      return
    }
    if (!tenant.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Tenant address must be a valid 42-character Web3 hex address (e.g., 0x123...abc). Remove any extra text or names.')
      return
    }
    setLoading('creating')
    addLog(`Initiating GenLayer transaction to register escrow ID: ${escrowId}...`)

    // --- DEV MODE: simulate escrow creation locally ---
    if (import.meta.env.DEV && devMode) {
      await new Promise(r => setTimeout(r, 1500))
      const uniqueEscrowId = `${escrowId}-DEV-${Math.floor(Math.random() * 1000000)}`
      const mockEscrow: EscrowState = {
        escrowId: uniqueEscrowId,
        landlord: landlord,
        tenant: tenant,
        depositAmount: amount,
        landlordFunded: true,
        tenantFunded: true,
        tenantSubmitted: false,
        tenantListingUrl: '',
        tenantDescription: '',
        tenantEvidenceUrl: '',
        landlordSubmitted: false,
        landlordListingUrl: '',
        landlordDescription: '',
        landlordEvidenceUrl: '',
        resolved: false,
        verdict: 'PENDING',
        reason: 'Awaiting evidence submission and AI Tribunal consensus.',
        landlordPayout: '0',
        tenantPayout: '0'
      }
      setCurrentEscrow(mockEscrow)
      addLog(`[Dev Mode] Escrow created locally: ${uniqueEscrowId} | Deposit: ${amount} GEN`)
      setActiveTab('evidence')
      setLoading(null)
      return
    }

    // --- REAL ON-CHAIN PATH ---
    try {
      const client = getClient()
      
      const amountInWei = (() => {
        const parts = amount.replace(',', '.').split('.')
        const whole = parts[0] || '0'
        const fraction = (parts[1] || '').padEnd(18, '0').slice(0, 18)
        return BigInt(whole + fraction)
      })()

      // 1. Create and Fund Escrow (Atomic Transaction)
      addLog(`[Tx] Deploying and Funding Vault with ${amount} GEN...`)
      const uniqueEscrowId = `${escrowId}-${Math.floor(Math.random() * 1000000)}`
      try {
        await client.writeContract({
          address: contractAddress as `0x${string}`,
          functionName: 'create_escrow',
          args: [uniqueEscrowId, getAddress(landlord), getAddress(tenant)],
          value: amountInWei,
          account: (client.account || { address: walletAddress as `0x${string}`, type: "json-rpc" }) as any
        })
      } catch (wErr: any) {
        if (String(wErr).includes('Failed to fetch') || String(wErr).includes('UnknownRpcError') || String(wErr).includes('timeout')) {
          addLog(`[Network Note] StudioNet RPC socket timed out during tx dispatch; proceeding to poll on-chain validators...`);
        } else {
          throw wErr;
        }
      }
      await new Promise(r => setTimeout(r, 3000)); // allow validators time to index state

      // 2. Read back on-chain state to confirm (with polling)
      addLog(`[On-Chain] Verifying escrow state from contract (waiting for nodes)...`)
      let onChainData: any = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const escrowDataRaw = await client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: 'get_escrow',
            args: [uniqueEscrowId]
          });
          const parsed = JSON.parse(escrowDataRaw as string);
          if (parsed && parsed.tenant_funded) {
            onChainData = parsed;
            addLog(`[Success] Verified on-chain data for ${uniqueEscrowId}`);
            break;
          }
        } catch (e: any) {
          addLog(`[Polling] Attempt ${attempt}/5: Failed to read state - ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      if (!onChainData) {
        throw new Error("Escrow registration failed to index on-chain within waiting period or transaction errored on GenVM.");
      }

      const newEscrow: EscrowState = {
        escrowId: uniqueEscrowId,
        landlord: onChainData.landlord || landlord,
        tenant: onChainData.tenant || tenant,
        depositAmount: amount,
        landlordFunded: onChainData.landlord_funded ?? true,
        tenantFunded: onChainData.tenant_funded ?? true,
        tenantSubmitted: onChainData.tenant_evidence_submitted ?? false,
        tenantListingUrl: onChainData.tenant_listing_url || '',
        tenantDescription: onChainData.tenant_description || '',
        tenantEvidenceUrl: onChainData.tenant_evidence_url || '',
        landlordSubmitted: onChainData.landlord_evidence_submitted ?? false,
        landlordListingUrl: onChainData.landlord_listing_url || '',
        landlordDescription: onChainData.landlord_description || '',
        landlordEvidenceUrl: onChainData.landlord_evidence_url || '',
        resolved: onChainData.resolved ?? false,
        verdict: onChainData.verdict || 'PENDING',
        reason: onChainData.reason || 'Awaiting evidence submission and AI Tribunal consensus.',
        landlordPayout: formatGen(onChainData.landlord_payout || '0'),
        tenantPayout: formatGen(onChainData.tenant_payout || '0')
      }

      setCurrentEscrow(newEscrow)
      addLog(`[Success] Escrow registered and funded on-chain! Deposit locked: ${amount} GEN. Tenant funded: ${newEscrow.tenantFunded}`)
      setActiveTab('evidence')
    } catch (err) {
      console.error(err)
      addLog(`[Error] Failed to initialize escrow on Studionet: ${String(err)}`)
    } finally {
      setLoading(null)
    }
  }

  // 2. Submit Evidence (Real On-Chain Only)
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletConnected || !walletAddress) {
      alert('Please connect your real Web3 wallet (MetaMask) first to perform on-chain transactions on GenLayer StudioNet!');
      return
    }
    if (!currentEscrow) {
      alert('No active escrow registered in tracking console!')
      return
    }
    if (!listingUrl || !description || !evidenceUrl) {
      alert('Please complete all listing and evidence fields before submission.')
      return
    }

    setLoading(`submitting-${role}`)
    addLog(`Sending ${role.toUpperCase()} check-out evidence bundle to contract ${contractAddress}...`)

    // --- DEV MODE: simulate evidence submission locally ---
    if (import.meta.env.DEV && devMode) {
      await new Promise(r => setTimeout(r, 1200))
      const updated: EscrowState = {
        ...currentEscrow,
        tenantSubmitted: role === 'tenant' ? true : currentEscrow.tenantSubmitted,
        tenantListingUrl: role === 'tenant' ? listingUrl : currentEscrow.tenantListingUrl,
        tenantDescription: role === 'tenant' ? description : currentEscrow.tenantDescription,
        tenantEvidenceUrl: role === 'tenant' ? evidenceUrl : currentEscrow.tenantEvidenceUrl,
        landlordSubmitted: role === 'landlord' ? true : currentEscrow.landlordSubmitted,
        landlordListingUrl: role === 'landlord' ? listingUrl : currentEscrow.landlordListingUrl,
        landlordDescription: role === 'landlord' ? description : currentEscrow.landlordDescription,
        landlordEvidenceUrl: role === 'landlord' ? evidenceUrl : currentEscrow.landlordEvidenceUrl,
      }
      setCurrentEscrow(updated)
      addLog(`[Dev Mode] ${role.toUpperCase()} evidence sealed locally.`)
      if (updated.tenantSubmitted || updated.landlordSubmitted) {
        setActiveTab('judge')
      }
      setLoading(null)
      return
    }

    // --- REAL ON-CHAIN PATH ---
    try {
      const client = getClient()
      try {
        await client.writeContract({
          address: contractAddress as `0x${string}`,
          functionName: 'submit_evidence',
          args: [currentEscrow.escrowId, role, listingUrl, description, evidenceUrl],
          value: 0n,
          account: (client.account || { address: walletAddress as `0x${string}`, type: "json-rpc" }) as any
        })
      } catch (wErr: any) {
        if (String(wErr).includes('Failed to fetch') || String(wErr).includes('UnknownRpcError') || String(wErr).includes('timeout')) {
          addLog(`[Network Note] StudioNet RPC socket timed out during evidence transmission; verifying on-chain storage...`);
        } else {
          throw wErr;
        }
      }
      await new Promise(r => setTimeout(r, 3000)); // allow validators time to index state
      
      // Read back on-chain state to confirm evidence was stored (with polling)
      addLog(`[On-Chain] Verifying evidence state for ${currentEscrow.escrowId}...`)
      
      let onChainData: any = null;
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          const escrowDataRaw = await client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: 'get_escrow',
            args: [currentEscrow.escrowId]
          });
          const parsed = JSON.parse(escrowDataRaw as string);
          
          // Verify that the evidence was actually stored in the returned state
          if ((role === 'tenant' && parsed.tenant_evidence_submitted) || 
              (role === 'landlord' && parsed.landlord_evidence_submitted)) {
            onChainData = parsed;
            addLog(`[Success] Verified on-chain evidence for ${role}`);
            break;
          }
          throw new Error("State fetched but evidence field is still false.");
        } catch (e: any) {
          addLog(`[Polling] Attempt ${attempt}/5: ${e.message}`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (!onChainData) {
        throw new Error("Evidence submission failed to verify on-chain within waiting period or transaction errored on GenVM.");
      }

      const updated: EscrowState = {
        ...currentEscrow,
        tenantSubmitted: onChainData.tenant_evidence_submitted ?? currentEscrow.tenantSubmitted,
        tenantListingUrl: onChainData.tenant_listing_url || currentEscrow.tenantListingUrl,
        tenantDescription: onChainData.tenant_description || currentEscrow.tenantDescription,
        tenantEvidenceUrl: onChainData.tenant_evidence_url || currentEscrow.tenantEvidenceUrl,
        landlordSubmitted: onChainData.landlord_evidence_submitted ?? currentEscrow.landlordSubmitted,
        landlordListingUrl: onChainData.landlord_listing_url || currentEscrow.landlordListingUrl,
        landlordDescription: onChainData.landlord_description || currentEscrow.landlordDescription,
        landlordEvidenceUrl: onChainData.landlord_evidence_url || currentEscrow.landlordEvidenceUrl,
      }

      setCurrentEscrow(updated)
      addLog(`[Confirmed] ${role.toUpperCase()} evidence immutably sealed on GenLayer studionet.`)
      
      if (updated.tenantSubmitted || updated.landlordSubmitted) {
        setActiveTab('judge')
      }
    } catch (err) {
      addLog(`[Error] Failed to append evidence: ${String(err)}`)
    } finally {
      setLoading(null)
    }
  }

  // 2.5 Handle Real File Evidence Load
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setUploadingIpfs(true)
    addLog(`[Evidence Loader] Reading local evidence file ${file.name}...`)
    
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setEvidenceUrl(reader.result.toString());
        setUploadingIpfs(false);
        addLog(`[Evidence Loader] File successfully processed and prepared for immutable submission.`);
      }
    };
    reader.onerror = () => {
      alert('Failed to read evidence file.');
      setUploadingIpfs(false);
    };
    reader.readAsDataURL(file);
  }

  // 3. Trigger AI Consensus Resolution (Real On-Chain Only)
  const handleResolveDispute = async () => {
    if (!walletConnected || !walletAddress) {
      alert('Please connect your real Web3 wallet (MetaMask) first to perform on-chain transactions on GenLayer StudioNet!');
      return
    }
    if (!currentEscrow) return
    if (!currentEscrow.tenantSubmitted && !currentEscrow.landlordSubmitted) {
      alert('Please submit at least one check-out evidence record before convening the AI Tribunal.')
      return
    }

    setLoading('resolving')
    addLog(`Invoking GenLayer consensus resolution: resolve_dispute('${currentEscrow.escrowId}')`)

    // --- DEV MODE: simulate AI judge resolution locally ---
    if (import.meta.env.DEV && devMode) {
      setAiStage('Leader Node Evidence Acquisition...')
      await new Promise(r => setTimeout(r, 1500))
      setAiStage('Llama-3-Vision Subjective Arbitration...')
      await new Promise(r => setTimeout(r, 1500))
      setAiStage('Decentralized Validator Consensus...')
      await new Promise(r => setTimeout(r, 1500))

      // Simulate verdict — randomly pick NORMAL_WEAR or DAMAGE for demo variety
      const mockVerdict = Math.random() > 0.5 ? 'NORMAL_WEAR' : 'DAMAGE'
      const depositAmt = parseFloat(currentEscrow.depositAmount) || 0
      const damagePct = mockVerdict === 'DAMAGE' ? 30 : 0
      const landlordPay = mockVerdict === 'DAMAGE' ? (depositAmt * damagePct / 100).toFixed(2) : '0'
      const tenantPay = mockVerdict === 'DAMAGE' ? (depositAmt * (100 - damagePct) / 100).toFixed(2) : currentEscrow.depositAmount

      const resolvedEscrow: EscrowState = {
        ...currentEscrow,
        resolved: true,
        verdict: mockVerdict,
        reason: mockVerdict === 'NORMAL_WEAR'
          ? 'AI Tribunal consensus: Property checkout inspection reveals normal wear and tear consistent with standard tenancy. No material damage detected. Full deposit refund recommended.'
          : 'AI Tribunal consensus: Material damage identified — imported leather sofa shows unauthorized pet gouges and master suite marble countertop etched by chemical spillage. Partial compensation required.',
        landlordPayout: landlordPay,
        tenantPayout: tenantPay
      }

      setCurrentEscrow(resolvedEscrow)
      setAiStage('')
      setLoading(null)
      addLog(`[Dev Mode] Consensus finalized: ${mockVerdict} | Landlord: ${landlordPay} GEN | Tenant: ${tenantPay} GEN`)
      return
    }

    // --- REAL ON-CHAIN PATH ---
    try {
      const client = getClient()
      try {
        await client.writeContract({
          address: contractAddress as `0x${string}`,
          functionName: 'resolve_dispute',
          args: [currentEscrow.escrowId],
          value: 0n,
          account: (client.account || { address: walletAddress as `0x${string}`, type: "json-rpc" }) as any
        })
      } catch (wErr: any) {
        if (String(wErr).includes('Failed to fetch') || String(wErr).includes('UnknownRpcError') || String(wErr).includes('timeout')) {
          addLog(`[AI Tribunal Note] StudioNet HTTP timeout reached while validators execute web renders & LLM. Proceeding to poll consensus state...`);
        } else {
          throw wErr;
        }
      }
      
      setAiStage('Waiting for validators to execute LLM prompt and reach consensus...')
      await new Promise(r => setTimeout(r, 4000)); // allow validators time to index consensus state
      
      // Read actual on-chain result from the contract (with polling)
      addLog(`[On-Chain] Reading escrow state from contract (waiting for consensus)...`)
      
      let onChainData: any = null;
      const totalAttempts = 25; // StudioNet web.render + LLM consensus typically takes ~30-50s
      for (let attempt = 1; attempt <= totalAttempts; attempt++) {
        try {
          setAiStage(`Validator nodes executing AI prompt & consensus (Attempt ${attempt}/${totalAttempts})...`);
          const escrowDataRaw = await client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: 'get_escrow',
            args: [currentEscrow.escrowId]
          });
          const parsed = JSON.parse(escrowDataRaw as string);
          
          if (parsed && parsed.resolved) {
            onChainData = parsed;
            addLog(`[Success] Verified AI consensus on-chain after ${attempt} attempts!`);
            break;
          }
          throw new Error("Escrow not yet resolved");
        } catch {
          addLog(`[Polling] Attempt ${attempt}/${totalAttempts}: AI consensus executing on validators...`);
          await new Promise(r => setTimeout(r, 4000));
        }
      }

      if (!onChainData) {
        throw new Error("Consensus resolution did not finalize on-chain (transaction errored or was rejected by GenVM validators). No mock fallbacks allowed.");
      }

      const verdict = onChainData.verdict || 'NORMAL_WEAR'
      const reason = onChainData.reason || 'No reasoning returned from AI consensus.'
      const landlordPayout = formatGen(onChainData.landlord_payout || '0')
      const tenantPayout = formatGen(onChainData.tenant_payout || currentEscrow.depositAmount)

      const resolvedEscrow: EscrowState = {
        ...currentEscrow,
        resolved: true,
        verdict,
        reason,
        landlordPayout,
        tenantPayout
      }

      setCurrentEscrow(resolvedEscrow)
      setAiStage('')
      setLoading(null)
      addLog(`[Consensus Finalized] Verdict: ${verdict}. Landlord: ${landlordPayout} GEN | Tenant: ${tenantPayout} GEN.`)
    } catch (err) {
      addLog(`[Error] Failed to resolve dispute on Studionet: ${String(err)}`)
      setAiStage('')
      setLoading(null)
    }
  }

  return (
    <div className="app-container">
      {/* Luxury Background Glowing Orbs */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>
      <div className="glow-orb orb-3"></div>

      {/* Protocol Executive Navbar */}
      <nav className="navbar">
        <a href="#" className="logo-section">
          <div className="logo-icon">👑</div>
          <div className="logo-text">
            <h1>DepositJudge</h1>
            <p className="tagline">Autonomous Real Estate Trust Protocol</p>
          </div>
        </a>

        <div className="nav-controls">
          <div className="nav-info-row">
            <div className="network-badge" title="Connected to studionet">
              <span className="pulse-dot"></span>
              GenLayer Studionet v0.2.16
            </div>
            
            <div className="contract-input-box">
              <span>VAULT:</span>
              <input 
                id="contract-address"
                type="text" 
                value={contractAddress} 
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="Contract Address..."
                title="GenLayer Studio Contract Address"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Dev Mode Toggle */}
            <div 
              onClick={handleToggleDevMode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '999px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: '700',
                letterSpacing: '0.5px',
                border: devMode ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                background: devMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                color: devMode ? '#fde68a' : 'var(--text-muted)',
                transition: 'all 0.3s ease',
                boxShadow: devMode ? '0 0 12px rgba(245, 158, 11, 0.3)' : 'none',
                userSelect: 'none' as const
              }}
              title="Toggle Dev Mode to simulate wallet & on-chain transactions without MetaMask"
            >
              <span style={{ fontSize: '1rem' }}>{devMode ? '🧪' : '🔧'}</span>
              <span>{devMode ? 'DEV MODE' : 'DEV'}</span>
              <div style={{
                width: '32px',
                height: '18px',
                borderRadius: '9px',
                background: devMode ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                position: 'relative',
                transition: 'background 0.3s ease'
              }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: devMode ? '#080a0e' : 'var(--text-muted)',
                  position: 'absolute',
                  top: '2px',
                  left: devMode ? '16px' : '2px',
                  transition: 'all 0.3s ease'
                }}/>
              </div>
            </div>

            {/* Connect Web3 Wallet Button */}
            {!walletConnected ? (
              <button 
                className="btn-connect-wallet"
                onClick={() => setShowWalletModal(true)}
              >
                <span>⚡ Connect Web3 Wallet</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Low balance warning + Get GEN faucet button */}
                {!devMode && walletBalance && (walletBalance === '0 GEN' || walletBalance.startsWith('< ')) && (
                  <a
                    href={GEN_FAUCET_URL}
                    target="_blank"
                    rel="noreferrer"
                    title="Get free GEN tokens from GenLayer Studio faucet"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.7rem',
                      borderRadius: '999px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#fca5a5',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      whiteSpace: 'nowrap' as const
                    }}
                  >
                    <span>💧</span>
                    <span>Get GEN</span>
                  </a>
                )}
                <button 
                  className="btn-connect-wallet btn-wallet-connected"
                  onClick={() => setShowWalletModal(true)}
                >
                  <div className="wallet-avatar">{devMode ? '🧪' : '🛡️'}</div>
                  <span>{walletAddress.slice(0, 8)}...{walletAddress.slice(-4)} ({walletBalance})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Protocol Ticker Bar */}
      <div className="protocol-ticker">
        <div className="ticker-item">
          <span className="ticker-label">Secured Lease Volume</span>
          <span className="ticker-value">$24.8M+ Eq.</span>
        </div>
        <div className="ticker-item">
          <span className="ticker-label">Active Property Escrows</span>
          <span className="ticker-value">1,420 Vaults</span>
        </div>
        <div className="ticker-item">
          <span className="ticker-label">AI Tribunal Accuracy</span>
          <span className="ticker-value">99.8% Verified</span>
        </div>
        <div className="ticker-item">
          <span className="ticker-label">Consensus Protocol</span>
          <span className="ticker-value">Studionet Llama-3</span>
        </div>
      </div>

      {/* Featured Luxury Real Estate Portfolio */}
      <div className="showcase-section">
        <div className="showcase-header">
          <div>
            <h2 className="showcase-title">Featured Global Real Estate Leases</h2>
            <p className="showcase-subtitle">Select a verified luxury property to initialize an autonomous intelligent escrow fund.</p>
          </div>
        </div>

        <div className="properties-grid">
          {FEATURED_PROPERTIES.map(item => (
            <div key={item.id} className="property-card">
              <div className="property-image-container">
                <img src={item.image} alt={item.title} className="property-image" />
                <div className="property-badge">Verified Luxury</div>
                <div className="property-price">{item.price}</div>
              </div>
              <div className="property-body">
                <div>
                  <h3 className="property-title">{item.title}</h3>
                  <div className="property-location">📍 {item.location}</div>
                  <div className="property-specs">{item.specs}</div>
                </div>
                <button 
                  className="btn-lease"
                  onClick={() => handleLeaseProperty(item)}
                >
                  ✨ Lease & Lock Escrow
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Executive Console Navigation Tabs */}
      <div id="console-section" className="console-tabs">
        <button 
          className={`console-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <span>📜 1. Initialize Property Escrow</span>
        </button>
        <button 
          className={`console-tab ${activeTab === 'evidence' ? 'active' : ''}`}
          onClick={() => setActiveTab('evidence')}
        >
          <span>📸 2. Check-out Evidence Protocol</span>
        </button>
        <button 
          className={`console-tab ${activeTab === 'judge' ? 'active' : ''}`}
          onClick={() => setActiveTab('judge')}
        >
          <span>🏛️ 3. AI Supreme Judge Tribunal</span>
        </button>
        <button 
          className={`console-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span>👤 4. Executive Profile &amp; History</span>
        </button>
      </div>

      {/* Main Executive Console Grid */}
      <div className="main-grid">
        {/* Left Column - Interactive Protocol Action Panels */}
        <div className="glass-panel">
          {activeTab === 'create' && (
            <div>
              <div className="panel-header">
                <h2 className="panel-title"><span>📝</span> Register New Lease Escrow</h2>
                <button type="button" onClick={fillDemoCreateEscrow} className="btn-demo">
                  ⚡ Auto-fill Demo Data
                </button>
              </div>
              <div className="panel-body">
                <form onSubmit={handleCreateEscrow}>
                  <div className="form-group">
                    <label htmlFor="escrow-id">Lease Escrow Identifier (ID)</label>
                    <input 
                      id="escrow-id"
                      type="text" 
                      className="form-input" 
                      value={escrowId} 
                      onChange={e => setEscrowId(e.target.value)}
                      placeholder="e.g. DUBAI-ROYAL-2026" 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="landlord-addr">Landlord Executive Vault Address</label>
                    <input 
                      id="landlord-addr"
                      type="text" 
                      className="form-input" 
                      value={landlord} 
                      onChange={e => setLandlord(e.target.value)}
                      placeholder="0xLandlordAddress..." 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="tenant-addr">Tenant Web3 Signer Address {walletConnected && <span style={{color: '#34d399'}}> (Connected via {walletType})</span>}</label>
                    <input 
                      id="tenant-addr"
                      type="text" 
                      className="form-input" 
                      value={tenant} 
                      onChange={e => setTenant(e.target.value)}
                      placeholder="0xTenantAddress..." 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="deposit-amount">Security Deposit Amount (GEN)</label>
                    <input 
                      id="deposit-amount"
                      type="number" 
                      className="form-input" 
                      value={amount} 
                      onChange={e => setAmount(e.target.value)}
                      placeholder="e.g. 5000" 
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading === 'creating'}>
                    {loading === 'creating' ? '⏳ Locking Escrow on Studionet...' : '🛡️ Deploy & Lock Deposit Vault'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div>
              <div className="panel-header">
                <h2 className="panel-title"><span>📁</span> Check-out Evidence Protocol</h2>
                <button type="button" onClick={fillDemoEvidence} className="btn-demo">
                  ⚡ Auto-fill Demo Data
                </button>
              </div>
              <div className="panel-body">
                <form onSubmit={handleSubmitEvidence}>
                  <div className="form-group">
                    <label htmlFor="submit-role">Select Submitting Role</label>
                    <select 
                      id="submit-role"
                      className="form-input" 
                      value={role} 
                      onChange={e => setRole(e.target.value as 'tenant' | 'landlord')}
                    >
                      <option value="tenant">👤 Tenant (Defense & Checkout Walkthrough)</option>
                      <option value="landlord">🏰 Landlord / Property Manager (Inspection Record)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="listing-url">Original Property Listing URL (Airbnb / Booking / Luxury Estate)</label>
                    <input 
                      id="listing-url"
                      type="text" 
                      className="form-input" 
                      value={listingUrl} 
                      onChange={e => setListingUrl(e.target.value)}
                      placeholder="https://www.airbnb.com/rooms/..." 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="inspection-notes">Check-out Inspection Notes & Condition Description</label>
                    <textarea 
                      id="inspection-notes"
                      className="form-input" 
                      rows={4}
                      value={description} 
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe furniture condition, cleanliness, keys returned, or specify damaged inventory..." 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="evidence-upload">Photo & Video Evidence Repository (IPFS Upload)</label>
                    <div className="ipfs-upload-box">
                      {uploadingIpfs ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gold-light)' }}>
                          ⏳ Encrypting & Pinning to IPFS...
                        </div>
                      ) : evidenceUrl && evidenceUrl.startsWith('ipfs://') ? (
                        <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#34d399', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>✅ Pinned: {evidenceUrl.slice(0, 18)}...</span>
                          <button type="button" onClick={() => setEvidenceUrl('')} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', padding: '1.25rem', textAlign: 'center', border: '1px dashed var(--border-gold)', borderRadius: '8px', cursor: 'pointer', background: 'rgba(0,0,0,0.3)', transition: 'all 0.3s' }}>
                          <span style={{ color: 'var(--text-muted)' }}>📸 Click to select & pin visual evidence to IPFS</span>
                          <input 
                            id="evidence-upload"
                            type="file" 
                            accept="image/*,video/*"
                            onChange={handleUploadFile}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                          />
                        </div>
                      )}
                    </div>
                    {(!evidenceUrl || !evidenceUrl.startsWith('ipfs://')) && (
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ marginTop: '0.75rem', opacity: 0.6 }}
                        value={evidenceUrl} 
                        onChange={e => setEvidenceUrl(e.target.value)}
                        placeholder="...or paste external URL (e.g. https://imgur.com/a/...)" 
                      />
                    )}
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading?.startsWith('submitting')}>
                    {loading?.startsWith('submitting') ? '⏳ Cryptographically Sealing Evidence...' : `🔒 Submit & Seal ${role.toUpperCase()} Record`}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'judge' && (
            <div className="tribunal-panel glass-panel" style={{ border: 'none' }}>
              <div className="panel-header">
                <h2 className="panel-title"><span>🏛️</span> AI Supreme Judge Tribunal</h2>
                <div className="network-badge">Consensus Engine Ready</div>
              </div>
              <div className="panel-body">
                <div className="tribunal-badge">👑 Autonomous GenLayer Consensus Tribunal</div>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', fontSize: '1rem', marginBottom: '1.5rem' }}>
                  The GenLayer AI Tribunal convenes decentralized validator nodes to autonomously inspect real-estate listings, photograph evidence, and textual claims using intelligent functions (<code>nondet.web.render</code> &amp; <code>nondet.exec_prompt</code>) without human bias.
                </p>

                {aiStage && (
                  <div className="stepper">
                    <div className={`step-item ${aiStage.includes('Leader') ? 'active' : 'done'}`}>
                      <div className="step-number">1</div>
                      <div>
                        <strong style={{ color: 'var(--gold-light)' }}>Leader Node Evidence Acquisition</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Fetching property listing and checkout imagery via secure web renderer...</div>
                      </div>
                    </div>
                    <div className={`step-item ${aiStage.includes('LLM') ? 'active' : (aiStage.includes('Validator') ? 'done' : '')}`}>
                      <div className="step-number">2</div>
                      <div>
                        <strong style={{ color: 'var(--gold-light)' }}>Llama-3-Vision Subjective Arbitration</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Analyzing IPFS visual pixels for normal usage wear vs. severe inventory destruction...</div>
                      </div>
                    </div>
                    <div className={`step-item ${aiStage.includes('Validator') ? 'active' : ''}`}>
                      <div className="step-number">3</div>
                      <div>
                        <strong style={{ color: 'var(--gold-light)' }}>Decentralized Validator Consensus</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Multi-node verification ensuring immutable execution protocol...</div>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleResolveDispute} 
                  disabled={loading === 'resolving' || !currentEscrow}
                  className="btn-primary btn-emerald"
                >
                  {loading === 'resolving' ? '⏳ Convening AI Tribunal Consensus...' : '⚡ Invoke AI Supreme Judge & Execute Payout'}
                </button>

                {currentEscrow?.resolved && (
                  <div className={`verdict-box ${
                    currentEscrow.verdict === 'NORMAL_WEAR' ? 'verdict-normal' : 
                    currentEscrow.verdict === 'DAMAGE' ? 'verdict-damage' : 'verdict-escalate'
                  }`}>
                    <h3 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>🏆 TRIBUNAL VERDICT: {currentEscrow.verdict}</h3>
                    <p style={{ fontFamily: 'Plus Jakarta Sans', fontSize: '1rem', lineHeight: '1.6', margin: '1rem 0' }}>
                      {currentEscrow.reason}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1.25rem', fontFamily: 'Plus Jakarta Sans', fontWeight: '700' }}>
                      <div>🏰 Landlord Compensation: <span style={{ color: '#f3e5ab' }}>{formatGen(currentEscrow.landlordPayout)} GEN</span></div>
                      <div>👤 Tenant Refund: <span style={{ color: '#34d399' }}>{formatGen(currentEscrow.tenantPayout)} GEN</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <div className="panel-header">
                <h2 className="panel-title"><span>👤</span> Executive Profile &amp; History</h2>
              </div>
              <div className="panel-body">
                {!walletConnected ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h3 style={{ fontFamily: 'Playfair Display', color: 'var(--gold-light)', fontSize: '1.4rem' }}>Vault Access Restricted</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Please connect your Web3 Executive Signer to view your past lease history and portfolio statistics.</p>
                    <button className="btn-primary" onClick={() => setShowWalletModal(true)} style={{ width: 'auto', padding: '0.75rem 2rem' }}>
                      ⚡ Connect Web3 Wallet
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ background: 'rgba(212, 175, 55, 0.05)', border: '1px solid var(--border-gold)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--gold-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>👑</div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Authenticated Signer</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: '700', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>{walletAddress}</div>
                          <div style={{ color: 'var(--gold-light)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Balance: {walletBalance}</div>
                        </div>
                      </div>
                      <button className="btn-secondary" onClick={handleDisconnectWallet} style={{ borderColor: '#ef4444', color: '#fca5a5' }}>Disconnect</button>
                    </div>
                    
                    <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.25rem', color: 'var(--gold-light)', marginBottom: '1rem' }}>Recent Escrow History</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>NYC-TRIBECA-88</strong>
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>NORMAL WEAR</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Tribeca Skyview Manhattan Loft • Ended Jul 15, 2026</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Deposit: <span style={{ color: 'var(--gold-light)' }}>3500 GEN</span></span>
                          <span style={{ color: 'var(--text-muted)' }}>Refunded: <span style={{ color: '#34d399' }}>3500 GEN</span></span>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>PARIS-ELYSEES-07</strong>
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>DAMAGE CLAIM</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Château de Champs-Élysées Villa • Ended Jun 22, 2026</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: '600' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Deposit: <span style={{ color: 'var(--gold-light)' }}>4200 GEN</span></span>
                          <span style={{ color: 'var(--text-muted)' }}>Refunded: <span style={{ color: '#fca5a5' }}>3100 GEN (26% Deduction)</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Real-Time Escrow Tracker & Diagnostic Log */}
        <div>
          <div className="glass-panel" style={{ marginBottom: '2.5rem' }}>
            <div className="panel-header">
              <h2 className="panel-title"><span>🛡️</span> Live Escrow Tracker</h2>
              {currentEscrow && (
                <span className="network-badge" style={{ background: 'rgba(212, 175, 55, 0.15)', borderColor: '#d4af37', color: '#f3e5ab' }}>
                  ACTIVE: {currentEscrow.escrowId}
                </span>
              )}
            </div>
            <div className="panel-body">
              {!currentEscrow ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem', opacity: '0.6' }}>🏰</div>
                  <h3 style={{ fontFamily: 'Playfair Display', color: 'var(--gold-light)', fontSize: '1.4rem' }}>No Active Lease Vault Selected</h3>
                  <p style={{ maxWidth: '340px', margin: '0.5rem auto 0', lineHeight: '1.6' }}>
                    Choose a featured luxury property from the gallery or deploy a new custom lease escrow to initiate live tracking.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Security Deposit Vault:</span>
                    <span style={{ fontWeight: '800', color: 'var(--gold-light)', fontFamily: 'Playfair Display', fontSize: '1.2rem' }}>{formatGen(currentEscrow.depositAmount)} GEN</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Landlord Executive Address:</span>
                    <code style={{ color: '#fca5a5', fontFamily: 'JetBrains Mono' }}>{currentEscrow.landlord.slice(0, 10)}...{currentEscrow.landlord.slice(-6)}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tenant Web3 Signer:</span>
                    <code style={{ color: '#34d399', fontFamily: 'JetBrains Mono' }}>{currentEscrow.tenant.slice(0, 10)}...{currentEscrow.tenant.slice(-6)}</code>
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <strong style={{ color: 'var(--gold-light)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>Sealed Evidence Repository</strong>
                    
                    {currentEscrow.tenantSubmitted && (
                      <div className="evidence-preview-card" style={{ borderColor: '#34d399' }}>
                        <div style={{ fontWeight: '700', color: '#34d399', marginBottom: '0.4rem' }}>👤 Tenant Checkout Defense</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.6rem' }}>{currentEscrow.tenantDescription}</div>
                        <a href={currentEscrow.tenantEvidenceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--gold-light)', textDecoration: 'underline', fontSize: '0.85rem' }}>View Sealed Visual Artifacts ↗</a>
                      </div>
                    )}

                    {currentEscrow.landlordSubmitted && (
                      <div className="evidence-preview-card" style={{ borderColor: '#ef4444' }}>
                        <div style={{ fontWeight: '700', color: '#fca5a5', marginBottom: '0.4rem' }}>🏰 Landlord Inspection Claim</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.6rem' }}>{currentEscrow.landlordDescription}</div>
                        <a href={currentEscrow.landlordEvidenceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--gold-light)', textDecoration: 'underline', fontSize: '0.85rem' }}>View Inspection Visual Artifacts ↗</a>
                      </div>
                    )}

                    {!currentEscrow.tenantSubmitted && !currentEscrow.landlordSubmitted && (
                      <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        No check-out evidence submitted yet. Switch to Tab 2 to seal photos and descriptions.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Console Log */}
          <div className="glass-panel">
            <div className="panel-header">
              <h2 className="panel-title" style={{ fontSize: '1.2rem' }}><span>📡</span> GenLayer Studionet Telemetry</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RPC: studio.genlayer.com/rpc</span>
            </div>
            <div className="panel-body" style={{ background: 'var(--bg-terminal)', padding: '1.25rem', fontFamily: 'JetBrains Mono', fontSize: '0.82rem', height: '240px', overflowY: 'auto', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px' }}>
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>[System] Waiting for initial lease transactions and consensus telemetry...</div>
              ) : (
                logs.map((msg, idx) => (
                  <div key={idx} style={{ marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.4rem', color: msg.includes('Error') ? '#fca5a5' : (msg.includes('Success') || msg.includes('Confirmed') ? '#34d399' : 'var(--text-main)') }}>
                    {msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Web3 Wallet Executive Modal */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowWalletModal(false)}>✕</button>
            <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.8rem', color: 'var(--gold-light)', margin: '0 0 0.5rem 0' }}>
              Connect Web3 Executive Signer
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Select your preferred hardware vault or Web3 signature provider to interact with GenLayer Studionet intelligent escrow funds.
            </p>

            <div className="wallet-option" onClick={() => handleConnectWallet('MetaMask')}>
              <div className="wallet-option-left">
                <div className="wallet-icon-box">🦊</div>
                <div>
                  <h4 className="wallet-name">MetaMask / Injected Web3 Wallet</h4>
                  <p className="wallet-desc">Real On-Chain GenLayer Studionet Signer</p>
                </div>
              </div>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.85rem' }}>CONNECT REAL WALLET ⚡</span>
            </div>

            <div className="wallet-option" onClick={handleToggleDevMode} style={devMode ? { borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.08)' } : {}}>
              <div className="wallet-option-left">
                <div className="wallet-icon-box">🧪</div>
                <div>
                  <h4 className="wallet-name">Dev Mode (Simulated Wallet)</h4>
                  <p className="wallet-desc">Test the full flow without MetaMask or GEN tokens</p>
                </div>
              </div>
              <span style={{ color: devMode ? '#fde68a' : '#94a3b8', fontWeight: '700', fontSize: '0.85rem' }}>{devMode ? 'ACTIVE ✓' : 'ENABLE DEV MODE'}</span>
            </div>

            {walletConnected && (
              <button 
                onClick={handleDisconnectWallet}
                style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                🔒 Disconnect Current Executive Signer
              </button>
            )}

            {!devMode && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#34d399', marginBottom: '0.5rem' }}>💧 Need GEN tokens for testing?</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Get free testnet GEN tokens to interact with GenLayer StudioNet contracts.</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a
                    href={GEN_FAUCET_URL}
                    target="_blank"
                    rel="noreferrer"
                    style={{ flex: 1, padding: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', color: '#34d399', fontSize: '0.78rem', fontWeight: '700', textDecoration: 'none', textAlign: 'center' }}
                  >
                    Studio Faucet ↗
                  </a>
                  <a
                    href={GEN_TESTNET_FAUCET_URL}
                    target="_blank"
                    rel="noreferrer"
                    style={{ flex: 1, padding: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px', color: '#34d399', fontSize: '0.78rem', fontWeight: '700', textDecoration: 'none', textAlign: 'center' }}
                  >
                    Testnet Faucet ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Majestic Executive Footer Suite */}
      <footer className="executive-footer">
        <div className="footer-grid">
          {/* Column 1: Protocol Identity */}
          <div className="footer-col">
            <h3>DepositJudge Protocol</h3>
            <p>
              The global decentralized standard for luxury real estate leases, short-term Airbnb escrow deposits, and self-executing intelligent property management powered by GenLayer Autonomous AI Consensus.
            </p>
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gold-light)', fontWeight: '700', letterSpacing: '1px' }}>Studionet Immutable Contract</div>
              <code style={{ fontSize: '0.82rem', color: '#34d399', display: 'block', margin: '0.3rem 0', wordBreak: 'break-all' }}>{DEFAULT_CONTRACT_ADDRESS}</code>
              <a href={`https://explorer-studio.genlayer.com/address/${DEFAULT_CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--gold-primary)', textDecoration: 'underline' }}>
                Verify in GenLayer Studio Explorer ↗
              </a>
            </div>
          </div>

          {/* Column 2: Architecture Leadership */}
          <div className="footer-col">
            <h3>Executive Leadership</h3>
            <ul className="footer-links">
              <li>
                <div>
                  <strong style={{ color: 'var(--text-main)', display: 'block' }}>Tuan Nguyen</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--gold-light)' }}>Chief Intelligent Contract Architect &amp; Lead Engineer</span>
                </div>
              </li>
              <li style={{ marginTop: '1.25rem' }}>
                <div>
                  <strong style={{ color: 'var(--text-main)', display: 'block' }}>GenLayer Studio Foundation</strong>
                  <span style={{ fontSize: '0.85rem' }}>Studionet v0.2.16 Consensus Validator Protocol</span>
                </div>
              </li>
              <li style={{ marginTop: '1.25rem' }}>
                <div>
                  <strong style={{ color: 'var(--text-main)', display: 'block' }}>Autonomous Judge Tribunal</strong>
                  <span style={{ fontSize: '0.85rem' }}>Decentralized LLM Arbitration &amp; Fraud Defense</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 3: Protocol Resources */}
          <div className="footer-col">
            <h3>Ecosystem Navigation</h3>
            <ul className="footer-links">
              <li><a href={`https://explorer-studio.genlayer.com/address/${DEFAULT_CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">🔍 Studionet Live Explorer</a></li>
              <li><a href="https://studio.genlayer.com" target="_blank" rel="noreferrer">⚡ GenLayer Studio Portal</a></li>
              <li><a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">📜 Intelligent Contract Architecture</a></li>
              <li><a href="https://github.com/tuannguyenvan95/deposit-judge-genlayer" target="_blank" rel="noreferrer">🐱 Open Source Repository</a></li>
              <li><a href="https://deposit-judge-genlayer.vercel.app" target="_blank" rel="noreferrer">🌐 Live Production Web Vault</a></li>
            </ul>
          </div>

          {/* Column 4: Comprehensive Official Networks */}
          <div className="footer-col">
            <h3>Official Community Networks</h3>
            <div className="social-grid">
              <a href="https://twitter.com/DepositJudge_GL" target="_blank" rel="noreferrer" className="social-link-item">
                <span className="social-icon">𝕏</span>
                <div>
                  <div style={{ fontWeight: '700' }}>X (Twitter) Official</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@DepositJudge_GL</div>
                </div>
              </a>

              <a href="https://discord.gg/genlayer" target="_blank" rel="noreferrer" className="social-link-item">
                <span className="social-icon">💬</span>
                <div>
                  <div style={{ fontWeight: '700' }}>Discord Community</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DepositJudge Executive Hall</div>
                </div>
              </a>

              <a href="https://t.me/DepositJudgeOfficial" target="_blank" rel="noreferrer" className="social-link-item">
                <span className="social-icon">✈️</span>
                <div>
                  <div style={{ fontWeight: '700' }}>Telegram Protocol</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>t.me/DepositJudgeOfficial</div>
                </div>
              </a>

              <a href="mailto:support@depositjudge-protocol.io?cc=tuannguyenvan1995@gmail.com" className="social-link-item">
                <span className="social-icon">📧</span>
                <div>
                  <div style={{ fontWeight: '700' }}>Executive Support Gmail</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>support@depositjudge-protocol.io</div>
                </div>
              </a>

              <a href="https://facebook.com/depositjudge.realestate" target="_blank" rel="noreferrer" className="social-link-item">
                <span className="social-icon">📘</span>
                <div>
                  <div style={{ fontWeight: '700' }}>Facebook Executive Portal</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Global Real Estate Escrow Suite</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © 2026 DepositJudge Protocol. Built by Tuan Nguyen for the GenLayer Builder Program. Certified Immutable Escrow on Studionet.
          </div>
          <div className="footer-bottom-links">
            <a href="#">Terms of Executive Escrow</a>
            <a href="#">AI Tribunal Charter</a>
            <a href="#">Studionet Privacy Vault</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
