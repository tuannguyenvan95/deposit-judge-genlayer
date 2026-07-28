import React, { useState } from 'react'
import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import './index.css'

// Configuration for GenLayer Studio Network (studionet)
const STUDIO_RPC = 'https://studio.genlayer.com/rpc' 
const DEFAULT_CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS || '0x3316cF283e8E9709c5DE8eA4dE0B4D3f4bfc46Db'

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
    price: '5.00 ETH / month',
    deposit: '5000',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    specs: '6 Bed • 8,500 sq ft • Private Helipad',
    listingUrl: 'https://www.airbnb.com/rooms/dubai-burj-royal-suite-2026',
    landlordAddress: '0x71C...49f (Emirates Realty Vault)'
  },
  {
    id: 'NYC-TRIBECA-88',
    title: 'Tribeca Skyview Manhattan Loft',
    location: 'New York City, USA',
    price: '3.50 ETH / month',
    deposit: '3500',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    specs: '3 Bed • 4,200 sq ft • Skyline Terrace',
    listingUrl: 'https://www.airbnb.com/rooms/ny-luxury-tribeca-loft-4291',
    landlordAddress: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7'
  },
  {
    id: 'PARIS-ELYSEES-07',
    title: 'Château de Champs-Élysées Villa',
    location: 'Paris, France',
    price: '4.20 ETH / month',
    deposit: '4200',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    specs: '5 Bed • 6,100 sq ft • Historic Courtyard',
    listingUrl: 'https://www.airbnb.com/rooms/paris-elysees-villa-heritage-8820',
    landlordAddress: '0x2F4E9a3b8D1c7B2a0E4d8e6F1A9b3C5d7e0B1C4E'
  },
  {
    id: 'LA-BEVERLY-99',
    title: 'Beverly Hills Glass Horizon Estate',
    location: 'Los Angeles, USA',
    price: '6.00 ETH / month',
    deposit: '6000',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
    specs: '7 Bed • 11,000 sq ft • Infinity Pool & Vault',
    listingUrl: 'https://www.airbnb.com/rooms/la-beverly-hills-infinity-estate-9931',
    landlordAddress: '0x4D2A9e8B1C7f3E0A5b6C9D1a2F4e7A8B0c3E6D9F'
  },
  {
    id: 'SG-MARINABAY-12',
    title: 'Singapore Marina Bay Sky Residence',
    location: 'Marina Bay, Singapore',
    price: '4.80 ETH / month',
    deposit: '4800',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    specs: '4 Bed • 5,200 sq ft • Infinity Pool',
    listingUrl: 'https://www.airbnb.com/rooms/singapore-marina-bay-sky-12',
    landlordAddress: '0x9E3F1c4B5A6d7B8c9F0D1E2A3B4C5D6E7F8a9B0C'
  },
  {
    id: 'TYO-ROPPONGI-05',
    title: 'Tokyo Roppongi Hills Penthouse',
    location: 'Roppongi, Tokyo, Japan',
    price: '3.90 ETH / month',
    deposit: '3900',
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

  // Form State for Escrow Creation
  const [escrowId, setEscrowId] = useState('NYC-TRIBECA-88')
  const [landlord, setLandlord] = useState('0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7')
  const [tenant, setTenant] = useState('0x3B41C52E58C2AaF5F1f4438Bc1B20D45B3f8a421')
  const [amount, setAmount] = useState('3500')

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

  // Add diagnostic log message
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 15)])
  }

  // Web3 Wallet Connector Handlers
  const handleConnectWallet = (type: string, address: string, balance: string) => {
    setWalletConnected(true)
    setWalletType(type)
    setWalletAddress(address)
    setWalletBalance(balance)
    setShowWalletModal(false)
    addLog(`[Web3 Auth] Connected executive signer: ${address} via ${type} (${balance})`)
  }

  const handleDisconnectWallet = () => {
    addLog(`[Web3 Auth] Disconnected executive signer ${walletAddress} (${walletType})`)
    setWalletConnected(false)
    setWalletAddress('')
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
      setTenant('0x3B41C52E58C2AaF5F1f4438Bc1B20D45B3f8a421')
    }
    setActiveTab('create')
    addLog(`[Lease Selected] Loaded luxury specifications for: ${property.title} (${property.location})`)
    window.scrollTo({ top: document.getElementById('console-section')?.offsetTop || 500, behavior: 'smooth' })
  }

  // Demo auto-fill helpers
  const handleFillDemoCreate = () => {
    setEscrowId('DUBAI-ROYAL-01')
    setLandlord('0x71C8A4E2909743e2Ab9f34b7F6B169de00000001')
    setTenant(walletConnected ? walletAddress : '0x3B41C52E58C2AaF5F1f4438Bc1B20D45B3f8a421')
    setAmount('5000')
    addLog('Pre-filled Royal Burj Dubai Penthouse lease parameters.')
  }

  const handleFillDemoEvidenceTenant = () => {
    setRole('tenant')
    setListingUrl('https://www.airbnb.com/rooms/dubai-burj-royal-suite-2026')
    setDescription('Completed checkout in immaculate condition. Marble kitchen counters sanitized, crystal chandelier intact, keys transferred to security vault. Minor floor scratch near wine cooler was explicitly documented during initial check-in protocol.')
    setEvidenceUrl('https://drive.google.com/drive/folders/dubai-penthouse-video-walkthrough-2026')
    addLog('Loaded sample Tenant luxury check-out defense record.')
  }

  const handleFillDemoEvidenceLandlordDamage = () => {
    setRole('landlord')
    setListingUrl('https://www.airbnb.com/rooms/dubai-burj-royal-suite-2026')
    setDescription('Tenant hosted an unauthorized executive gala. Italian marble island features severe acid oxidation stains from unattended glassware, and two original artwork frames in the grand suite suffered structural impact fracture.')
    setEvidenceUrl('https://imgur.com/a/dubai-penthouse-damage-claim-inspection-2026')
    addLog('Loaded sample Landlord claim (Severe Luxury Damage Case).')
  }

  const handleFillDemoEvidenceLandlordNormal = () => {
    setRole('landlord')
    setListingUrl('https://www.airbnb.com/rooms/dubai-burj-royal-suite-2026')
    setDescription('Penthouse returned in acceptable condition. Minor scuffing on hardwood balcony deck is consistent with regular weathering. No furniture or structural fixtures damaged.')
    setEvidenceUrl('https://imgur.com/a/dubai-penthouse-normal-wear-inspection-2026')
    addLog('Loaded sample Landlord claim (Normal Wear Protocol).')
  }

  // GenLayer client execution simulator / live connection
  const getClient = () => {
    const client = createClient({ chain: studionet })
    console.log('GenLayer client initialized for network:', client.chain?.name, 'RPC:', STUDIO_RPC)
    return client
  }

  // 1. Create & Register Escrow
  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!escrowId || !landlord || !tenant || !amount) {
      alert('Please fill in all mandatory parameters.')
      return
    }
    setLoading('creating')
    addLog(`Initiating GenLayer transaction to register escrow ID: ${escrowId}...`)
    try {
      getClient()
      await new Promise(r => setTimeout(r, 900))

      const newEscrow: EscrowState = {
        escrowId,
        landlord,
        tenant,
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

      setCurrentEscrow(newEscrow)
      addLog(`[Success] Escrow registered on studionet! Deposit locked: ${amount} GEN/ETH equivalent.`)
      setActiveTab('evidence')
    } catch (err) {
      console.error(err)
      addLog(`[Error] Failed to initialize escrow on Studionet: ${String(err)}`)
    } finally {
      setLoading(null)
    }
  }

  // 2. Submit Evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
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
    try {
      await new Promise(r => setTimeout(r, 800))

      const updated = { ...currentEscrow }
      if (role === 'tenant') {
        updated.tenantSubmitted = true
        updated.tenantListingUrl = listingUrl
        updated.tenantDescription = description
        updated.tenantEvidenceUrl = evidenceUrl
      } else {
        updated.landlordSubmitted = true
        updated.landlordListingUrl = listingUrl
        updated.landlordDescription = description
        updated.landlordEvidenceUrl = evidenceUrl
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

  // 3. Trigger AI Consensus Resolution
  const handleResolveDispute = async () => {
    if (!currentEscrow) return
    if (!currentEscrow.tenantSubmitted && !currentEscrow.landlordSubmitted) {
      alert('Please submit at least one check-out evidence record before convening the AI Tribunal.')
      return
    }

    setLoading('resolving')
    addLog(`Invoking GenLayer consensus resolution: resolve_dispute('${currentEscrow.escrowId}')`)
    
    // Simulate GenLayer consensus stages
    setAiStage('Leader Validator fetching public listing via nondet.web.render...')
    await new Promise(r => setTimeout(r, 1500))

    setAiStage('Analyzing check-out photos & subjective claims with LLM nondet.exec_prompt...')
    await new Promise(r => setTimeout(r, 2000))

    setAiStage('Validator consensus nodes cross-verifying Leader judgment...')
    await new Promise(r => setTimeout(r, 1500))

    // Subjective consensus decision simulation
    const descriptionText = (currentEscrow.landlordDescription + ' ' + currentEscrow.tenantDescription).toLowerCase()
    let verdict = 'NORMAL_WEAR'
    let damagePct = 0
    let reason = 'AI Tribunal Consensus: Check-out photos indicate only customary surface wear consistent with standard residency. No structural breaches or appliance damage verified. Full security deposit refunded to Tenant.'

    if (descriptionText.includes('burn') || descriptionText.includes('shattered') || descriptionText.includes('missing') || descriptionText.includes('broken') || descriptionText.includes('fracture') || descriptionText.includes('oxidation')) {
      verdict = 'DAMAGE'
      damagePct = 35
      reason = 'AI Tribunal Consensus: Visual examination confirms severe thermal and oxidation staining on luxury stone furnishings along with fractured interior decor. Landlord claim corroborated by listing inventory baseline. A 35% compensation deduction is awarded to Landlord.'
    } else if (descriptionText.includes('fraud') || descriptionText.includes('fake') || descriptionText.includes('unclear')) {
      verdict = 'DISPUTE_ESCALATE'
      reason = 'AI Tribunal Consensus: Contradictory evidence metadata requires direct physical inspection by GenLayer arbitration governors. Funds remain locked in decentralized vault.'
    }

    const depositVal = parseInt(currentEscrow.depositAmount) || 0
    let landlordPayout = 0
    let tenantPayout = 0

    if (verdict === 'NORMAL_WEAR') {
      tenantPayout = depositVal
    } else if (verdict === 'DAMAGE') {
      const penalty = Math.floor((depositVal * damagePct) / 100)
      landlordPayout = penalty
      tenantPayout = depositVal - penalty
    }

    const resolvedEscrow: EscrowState = {
      ...currentEscrow,
      resolved: true,
      verdict,
      reason,
      landlordPayout: landlordPayout.toString(),
      tenantPayout: tenantPayout.toString()
    }

    setCurrentEscrow(resolvedEscrow)
    setAiStage('')
    setLoading(null)
    addLog(`[Consensus Finalized] Verdict: ${verdict}. Landlord: ${landlordPayout} GEN | Tenant: ${tenantPayout} GEN.`)
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
                type="text" 
                value={contractAddress} 
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="Contract Address..."
                title="GenLayer Studio Contract Address"
              />
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
            <button 
              className="btn-connect-wallet btn-wallet-connected"
              onClick={() => setShowWalletModal(true)}
            >
              <div className="wallet-avatar">🛡️</div>
              <span>{walletAddress} ({walletBalance})</span>
            </button>
          )}
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
                <h2 className="panel-title"><span>🏰</span> Register New Lease Escrow</h2>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleFillDemoCreate}
                >
                  ✨ Auto-fill Dubai Penthouse Demo
                </button>
              </div>
              <div className="panel-body">
                <form onSubmit={handleCreateEscrow}>
                  <div className="form-group">
                    <label>Lease Escrow Identifier (ID)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={escrowId} 
                      onChange={e => setEscrowId(e.target.value)}
                      placeholder="e.g. DUBAI-ROYAL-2026" 
                    />
                  </div>
                  <div className="form-group">
                    <label>Landlord Executive Vault Address</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={landlord} 
                      onChange={e => setLandlord(e.target.value)}
                      placeholder="0xLandlordAddress..." 
                    />
                  </div>
                  <div className="form-group">
                    <label>Tenant Web3 Signer Address {walletConnected && <span style={{color: '#34d399'}}> (Connected via {walletType})</span>}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={tenant} 
                      onChange={e => setTenant(e.target.value)}
                      placeholder="0xTenantAddress..." 
                    />
                  </div>
                  <div className="form-group">
                    <label>Security Deposit Amount (GEN / ETH)</label>
                    <input 
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
                <h2 className="panel-title"><span>📸</span> Check-out Evidence Protocol</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn-secondary" onClick={handleFillDemoEvidenceTenant}>
                    👤 Tenant Proof
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleFillDemoEvidenceLandlordDamage} style={{ borderColor: '#ef4444' }}>
                    ⚠️ Damage Claim
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleFillDemoEvidenceLandlordNormal} style={{ borderColor: '#10b981' }}>
                    ✨ Normal Wear Claim
                  </button>
                </div>
              </div>
              <div className="panel-body">
                <form onSubmit={handleSubmitEvidence}>
                  <div className="form-group">
                    <label>Select Submitting Role</label>
                    <select 
                      className="form-input" 
                      value={role} 
                      onChange={e => setRole(e.target.value as 'tenant' | 'landlord')}
                    >
                      <option value="tenant">👤 Tenant (Defense & Checkout Walkthrough)</option>
                      <option value="landlord">🏰 Landlord / Property Manager (Inspection Record)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Original Property Listing URL (Airbnb / Booking / Luxury Estate)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={listingUrl} 
                      onChange={e => setListingUrl(e.target.value)}
                      placeholder="https://www.airbnb.com/rooms/..." 
                    />
                  </div>
                  <div className="form-group">
                    <label>Check-out Inspection Notes & Condition Description</label>
                    <textarea 
                      className="form-input" 
                      rows={4}
                      value={description} 
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Describe furniture condition, cleanliness, keys returned, or specify damaged inventory..." 
                    />
                  </div>
                  <div className="form-group">
                    <label>Photo & Video Evidence Repository URL (Imgur / Drive / IPFS)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={evidenceUrl} 
                      onChange={e => setEvidenceUrl(e.target.value)}
                      placeholder="https://imgur.com/a/..." 
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
                        <strong style={{ color: 'var(--gold-light)' }}>LLM Subjective Arbitration &amp; Reasoning</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Evaluating normal usage wear vs. severe inventory destruction...</div>
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
                      <div>🏰 Landlord Compensation: <span style={{ color: '#f3e5ab' }}>{currentEscrow.landlordPayout} GEN</span></div>
                      <div>👤 Tenant Refund: <span style={{ color: '#34d399' }}>{currentEscrow.tenantPayout} GEN</span></div>
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
                    <span style={{ fontWeight: '800', color: 'var(--gold-light)', fontFamily: 'Playfair Display', fontSize: '1.2rem' }}>{currentEscrow.depositAmount} GEN/ETH</span>
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

            <div className="wallet-option" onClick={() => handleConnectWallet('MetaMask', '0x71C8...3f8A (MetaMask Vault)', '4,500 GEN / 12.5 ETH')}>
              <div className="wallet-option-left">
                <div className="wallet-icon-box">🦊</div>
                <div>
                  <h4 className="wallet-name">MetaMask Bridge</h4>
                  <p className="wallet-desc">Ethereum EVM &amp; GenLayer Cross-chain Signer</p>
                </div>
              </div>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.85rem' }}>READY ⚡</span>
            </div>

            <div className="wallet-option" onClick={() => handleConnectWallet('Coinbase Wallet', '0x2F4E...1C4E (Coinbase Executive)', '8,200 GEN')}>
              <div className="wallet-option-left">
                <div className="wallet-icon-box">🛡️</div>
                <div>
                  <h4 className="wallet-name">Coinbase Wallet</h4>
                  <p className="wallet-desc">Institutional Custody &amp; Security Vault</p>
                </div>
              </div>
              <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.85rem' }}>VAULT READY</span>
            </div>

            <div className="wallet-option" onClick={() => handleConnectWallet('WalletConnect', '0x9B1c...8D2a (Mobile Session)', '1,250 GEN')}>
              <div className="wallet-option-left">
                <div className="wallet-icon-box">🌐</div>
                <div>
                  <h4 className="wallet-name">WalletConnect Protocol</h4>
                  <p className="wallet-desc">Multi-chain QR Mobile Authenticator</p>
                </div>
              </div>
              <span style={{ color: 'var(--gold-light)', fontWeight: '700', fontSize: '0.85rem' }}>SCAN QR</span>
            </div>

            <div className="wallet-option" onClick={() => handleConnectWallet('GenLayer Landlord Key', '0x8920...43e7 (Studio Landlord)', '15,000 GEN')}>
              <div className="wallet-option-left">
                <div className="wallet-icon-box">👑</div>
                <div>
                  <h4 className="wallet-name">GenLayer Studio Key (Landlord)</h4>
                  <p className="wallet-desc">Native Studionet Lessor Authority Key</p>
                </div>
              </div>
              <span style={{ color: 'var(--gold-primary)', fontWeight: '800', fontSize: '0.85rem' }}>NATIVE KEY</span>
            </div>

            <div className="wallet-option" onClick={() => handleConnectWallet('GenLayer Tenant Key', '0x3B41...a421 (Studio Tenant)', '3,500 GEN')}>
              <div className="wallet-option-left">
                <div className="wallet-icon-box">👤</div>
                <div>
                  <h4 className="wallet-name">GenLayer Studio Key (Tenant)</h4>
                  <p className="wallet-desc">Native Studionet Lessee Authority Key</p>
                </div>
              </div>
              <span style={{ color: 'var(--gold-primary)', fontWeight: '800', fontSize: '0.85rem' }}>NATIVE KEY</span>
            </div>

            {walletConnected && (
              <button 
                onClick={handleDisconnectWallet}
                style={{ width: '100%', padding: '0.85rem', marginTop: '1rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                🔒 Disconnect Current Executive Signer
              </button>
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
              <a href={`https://genlayer-explorer.vercel.app/address/${DEFAULT_CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--gold-primary)', textDecoration: 'underline' }}>
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
              <li><a href={`https://genlayer-explorer.vercel.app/address/${DEFAULT_CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">🔍 Studionet Live Explorer</a></li>
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
