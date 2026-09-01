import React, { useState, useEffect } from 'react'
import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { getAddress } from 'viem'
import './index.css'
import { formatGen } from './utils'

// Configuration for GenLayer Studio Network (studionet)
const DEFAULT_CONTRACT_ADDRESS = '0x6068Fa240E703B394e2DA037F863Aa1E7935Ce15'
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


function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'evidence' | 'judge' | 'profile'>('create')
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS)

  // Web3 Wallet Connection State
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletType, setWalletType] = useState('')
  const [walletBalance, setWalletBalance] = useState('')

  // Form State for Escrow Creation
  const [escrowId, setEscrowId] = useState('')
  const [landlord, setLandlord] = useState('')
  const [tenant, setTenant] = useState('')
  const [amount, setAmount] = useState('')

  // Form State for Evidence Submission
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant')
  const [listingUrl, setListingUrl] = useState('')
  const [description, setDescription] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')

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
            setTenant(accounts[0])
            fetchBalance(accounts[0])
          }
        } catch (err) {
          console.error("Failed to re-hydrate wallet connection:", err)
        }
      }
    }
    checkConnection()
  }, [])

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




  // Wallet connection handlers
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
        addLog(`Wallet connected: ${address} via ${type}`)
      } else {
        alert("Web3 Provider not found! Please install MetaMask or a compatible Ethereum wallet extension to interact with GenLayer StudioNet directly.");
      }
    } catch (err) {
      addLog(`[Web3 Auth] Connection failed: ${String(err)}`)
    }
  }

  const handleDisconnectWallet = () => {
    addLog(`Wallet disconnected.`)
    setWalletConnected(false)
    setWalletAddress('')
    setTenant('')
    setWalletType('')
    setWalletBalance('')
  }
  // GenLayer client
  const getClient = () => {
    const config: any = { chain: studionet }
    if (typeof window !== 'undefined' && (window as any).ethereum && walletConnected && walletAddress) {
      config.provider = (window as any).ethereum
      config.account = walletAddress
    }
    return createClient(config)
  }


  // 1. Create & Register Escrow
  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletConnected || !walletAddress) {
      alert('Please connect your Web3 wallet (MetaMask) first.')
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
      alert('Landlord address must be a valid 42-character hex address.')
      return
    }
    if (!tenant.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Tenant address must be a valid 42-character hex address.')
      return
    }
    setLoading('creating')

    try {
      const client = getClient()
      
      const amountInWei = (() => {
        const parts = amount.replace(',', '.').split('.')
        const whole = parts[0] || '0'
        const fraction = (parts[1] || '').padEnd(18, '0').slice(0, 18)
        return BigInt(whole + fraction)
      })()

      const uniqueEscrowId = escrowId.trim()

      // Step 1: Send signed transaction to GenLayer
      addLog(`Sending create_escrow transaction for ${uniqueEscrowId}...`)
      const txHash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'create_escrow',
        args: [uniqueEscrowId, getAddress(landlord), getAddress(tenant)],
        value: amountInWei,
      })
      addLog(`Transaction submitted: ${txHash}`)

      // Step 2: Wait for GenLayer consensus to finalize the transaction
      addLog(`Waiting for GenLayer validators to finalize transaction...`)
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
      })
      addLog(`Transaction finalized. Status: ${receipt.statusName || receipt.status}`)
      if ((receipt as any).txExecutionResult !== undefined && (receipt as any).txExecutionResult !== 1 && (receipt as any).txExecutionResult !== 0) {
        throw new Error(`Transaction reverted on-chain by GenVM (Result: ${(receipt as any).txExecutionResultName || (receipt as any).txExecutionResult})`)
      }

      // Step 3: Read confirmed on-chain state
      addLog(`Reading escrow state from contract...`)
      const escrowDataRaw = await client.readContract({
        address: contractAddress as `0x${string}`,
        functionName: 'get_escrow',
        args: [uniqueEscrowId]
      })
      const onChainData = JSON.parse(escrowDataRaw as string)

      const newEscrow: EscrowState = {
        escrowId: uniqueEscrowId,
        landlord: onChainData.landlord || landlord,
        tenant: onChainData.tenant || tenant,
        depositAmount: amount,
        landlordFunded: onChainData.landlord_funded,
        tenantFunded: onChainData.tenant_funded,
        tenantSubmitted: onChainData.tenant_evidence_submitted,
        tenantListingUrl: onChainData.tenant_listing_url || '',
        tenantDescription: onChainData.tenant_description || '',
        tenantEvidenceUrl: onChainData.tenant_evidence_url || '',
        landlordSubmitted: onChainData.landlord_evidence_submitted,
        landlordListingUrl: onChainData.landlord_listing_url || '',
        landlordDescription: onChainData.landlord_description || '',
        landlordEvidenceUrl: onChainData.landlord_evidence_url || '',
        resolved: onChainData.resolved,
        verdict: onChainData.verdict || 'PENDING',
        reason: onChainData.reason || 'Awaiting evidence submission.',
        landlordPayout: formatGen(onChainData.landlord_payout || '0'),
        tenantPayout: formatGen(onChainData.tenant_payout || '0')
      }

      setCurrentEscrow(newEscrow)
      addLog(`Escrow ${uniqueEscrowId} created and funded with ${amount} GEN.`)
      setActiveTab('evidence')
    } catch (err) {
      console.error(err)
      addLog(`[Error] ${String(err)}`)
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

    try {
      const client = getClient()

      // Step 1: Send signed transaction
      addLog(`Sending submit_evidence transaction (${role})...`)
      const txHash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'submit_evidence',
        args: [currentEscrow.escrowId, role, listingUrl, description, evidenceUrl],
        value: 0n,
      })
      addLog(`Transaction submitted: ${txHash}`)

      // Step 2: Wait for finalization
      addLog(`Waiting for GenLayer validators to finalize...`)
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
      })
      addLog(`Transaction finalized. Status: ${receipt.statusName || receipt.status}`)
      if ((receipt as any).txExecutionResult !== undefined && (receipt as any).txExecutionResult !== 1 && (receipt as any).txExecutionResult !== 0) {
        throw new Error(`Transaction reverted on-chain by GenVM (Result: ${(receipt as any).txExecutionResultName || (receipt as any).txExecutionResult})`)
      }

      // Step 3: Read confirmed state
      addLog(`Reading evidence state from contract...`)
      const escrowDataRaw = await client.readContract({
        address: contractAddress as `0x${string}`,
        functionName: 'get_escrow',
        args: [currentEscrow.escrowId]
      })
      const onChainData = JSON.parse(escrowDataRaw as string)

      const updated: EscrowState = {
        ...currentEscrow,
        tenantSubmitted: onChainData.tenant_evidence_submitted,
        tenantListingUrl: onChainData.tenant_listing_url || currentEscrow.tenantListingUrl,
        tenantDescription: onChainData.tenant_description || currentEscrow.tenantDescription,
        tenantEvidenceUrl: onChainData.tenant_evidence_url || currentEscrow.tenantEvidenceUrl,
        landlordSubmitted: onChainData.landlord_evidence_submitted,
        landlordListingUrl: onChainData.landlord_listing_url || currentEscrow.landlordListingUrl,
        landlordDescription: onChainData.landlord_description || currentEscrow.landlordDescription,
        landlordEvidenceUrl: onChainData.landlord_evidence_url || currentEscrow.landlordEvidenceUrl,
      }

      setCurrentEscrow(updated)
      addLog(`${role.toUpperCase()} evidence sealed on-chain.`)
      
      if (updated.tenantSubmitted || updated.landlordSubmitted) {
        setActiveTab('judge')
      }
    } catch (err) {
      addLog(`[Error] ${String(err)}`)
    } finally {
      setLoading(null)
    }
  }

  // 3. Trigger AI Consensus Resolution
  const handleResolveDispute = async () => {
    if (!walletConnected || !walletAddress) {
      alert('Please connect your Web3 wallet (MetaMask) first.')
      return
    }
    if (!currentEscrow) return
    if (!currentEscrow.tenantSubmitted && !currentEscrow.landlordSubmitted) {
      alert('Please submit at least one evidence record before resolving.')
      return
    }

    setLoading('resolving')

    try {
      const client = getClient()

      // Step 1: Send resolve_dispute transaction
      addLog(`Sending resolve_dispute transaction for ${currentEscrow.escrowId}...`)
      const txHash = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'resolve_dispute',
        args: [currentEscrow.escrowId],
        value: 0n,
      })
      addLog(`Transaction submitted: ${txHash}`)

      // Step 2: Wait for GenLayer AI consensus to finalize
      // This transaction involves nondet.web.render + nondet.exec_prompt,
      // so validators need extra time to reach consensus.
      setAiStage('Waiting for GenLayer AI consensus...')
      addLog(`Waiting for AI consensus finalization (this may take 30-120s)...`)
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
      })
      addLog(`AI consensus finalized. Status: ${receipt.statusName || receipt.status}`)
      if ((receipt as any).txExecutionResult !== undefined && (receipt as any).txExecutionResult !== 1 && (receipt as any).txExecutionResult !== 0) {
        throw new Error(`Transaction reverted on-chain by GenVM (Result: ${(receipt as any).txExecutionResultName || (receipt as any).txExecutionResult})`)
      }

      // Step 3: Read the verdict from contract state
      addLog(`Reading verdict from contract...`)
      const escrowDataRaw = await client.readContract({
        address: contractAddress as `0x${string}`,
        functionName: 'get_escrow',
        args: [currentEscrow.escrowId]
      })
      const onChainData = JSON.parse(escrowDataRaw as string)

      const verdict = onChainData.verdict || 'NORMAL_WEAR'
      const reason = onChainData.reason || 'No reasoning returned.'
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
      addLog(`Verdict: ${verdict}. Landlord: ${landlordPayout} GEN | Tenant: ${tenantPayout} GEN.`)
    } catch (err) {
      addLog(`[Error] ${String(err)}`)
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
                {walletBalance && (walletBalance === '0 GEN' || walletBalance.startsWith('< ')) && (
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
                  <div className="wallet-avatar">🛡️</div>
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
                    <label htmlFor="evidence-url">Photo & Video Evidence Repository URL</label>
                    <input 
                      id="evidence-url"
                      type="text" 
                      className="form-input" 
                      value={evidenceUrl} 
                      onChange={e => setEvidenceUrl(e.target.value)}
                      placeholder="Paste external URL (e.g. https://imgur.com/a/...)" 
                    />
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

            {walletConnected && (
              <button 
                onClick={handleDisconnectWallet}
                style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                🔒 Disconnect Current Executive Signer
              </button>
            )}

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
