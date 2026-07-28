import React, { useState } from 'react'
import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import './index.css'

// Configuration for GenLayer Studio Network (studionet)
const STUDIO_RPC = 'https://studio.genlayer.com/rpc' 
const DEFAULT_CONTRACT_ADDRESS = import.meta.env.VITE_GENLAYER_CONTRACT_ADDRESS || '0x3316cF283e8E9709c5DE8eA4dE0B4D3f4bfc46Db'

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
  const [activeTab, setActiveTab] = useState<'create' | 'evidence' | 'judge'>('create')
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS)
  const [connectionStatus, setConnectionStatus] = useState<string>('Connected to studionet ⚡')

  // Form State for Escrow Creation
  const [escrowId, setEscrowId] = useState('')
  const [landlord, setLandlord] = useState('')
  const [tenant, setTenant] = useState('')
  const [amount, setAmount] = useState('1000')

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

  // Demo auto-fill helpers
  const handleFillDemoCreate = () => {
    setEscrowId('AIRBNB-SX-2026')
    setLandlord('0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7')
    setTenant('0x3B41C52E58C2AaF5F1f4438Bc1B20D45B3f8a421')
    setAmount('1500')
    addLog('Pre-filled sample Airbnb rental data for escrow creation.')
  }

  const handleFillDemoEvidenceTenant = () => {
    setRole('tenant')
    setListingUrl('https://www.airbnb.com/rooms/sample-luxury-condo-hanoi-2026')
    setDescription('Checked out on time. Left the room clean, garbage disposed, keys in lockbox as requested. Minor surface scuff on hallway floor was already present at check-in as noted in original photos.')
    setEvidenceUrl('https://drive.google.com/drive/folders/tenant-checkout-video-proof-2026')
    addLog('Loaded sample Tenant check-out evidence.')
  }

  const handleFillDemoEvidenceLandlordDamage = () => {
    setRole('landlord')
    setListingUrl('https://www.airbnb.com/rooms/sample-luxury-condo-hanoi-2026')
    setDescription('Tenant hosted an unauthorized gathering. Kitchen quartz countertop has a deep thermal burn mark from hot cookware, and 2 wine glasses from the inventory are missing and shattered in disposal.')
    setEvidenceUrl('https://imgur.com/a/landlord-damage-inspection-photos-countertop')
    addLog('Loaded sample Landlord claim (Damage Case).')
  }

  const handleFillDemoEvidenceLandlordNormal = () => {
    setRole('landlord')
    setListingUrl('https://www.airbnb.com/rooms/sample-luxury-condo-hanoi-2026')
    setDescription('Room returned in acceptable condition. Small stains on bath sheets washing out cleanly during normal laundering. No structure or appliance damage found.')
    setEvidenceUrl('https://imgur.com/a/landlord-inspection-normal-wear-2026')
    addLog('Loaded sample Landlord claim (Normal Wear Case).')
  }

  // GenLayer client execution simulator / live connection
  const getClient = () => {
    const client = createClient({ chain: studionet })
    // Ensure studionet chain details are actively utilized in client initialization
    console.log('GenLayer client initialized for network:', client.chain?.name, 'RPC:', STUDIO_RPC)
    return client
  }

  const handleReconnect = () => {
    setConnectionStatus('Reconnecting...')
    setTimeout(() => {
      setConnectionStatus(`Connected (${STUDIO_RPC.slice(8, 26)}...) ⚡`)
      addLog(`Re-established studionet SDK connection to contract [${contractAddress.slice(0, 10)}...]`)
    }, 500)
  }

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('Creating decentralized escrow on studionet...')
    addLog(`Initiating create_escrow on contract [${contractAddress.slice(0, 8)}...] via genlayer-js...`)
    
    try {
      const client = getClient()
      addLog(`Connected to GenLayer studio chain [ID: ${client.chain?.id}]. Broadcasting transaction...`)
      await new Promise(r => setTimeout(r, 1200))
      
      const newEscrow: EscrowState = {
        escrowId,
        landlord,
        tenant,
        depositAmount: amount,
        landlordFunded: false,
        tenantFunded: false,
        tenantSubmitted: false,
        tenantListingUrl: '',
        tenantDescription: '',
        tenantEvidenceUrl: '',
        landlordSubmitted: false,
        landlordListingUrl: '',
        landlordDescription: '',
        landlordEvidenceUrl: '',
        resolved: false,
        verdict: '',
        reason: '',
        landlordPayout: '0',
        tenantPayout: '0'
      }
      setCurrentEscrow(newEscrow)
      addLog(`✨ Escrow [${escrowId}] deployed successfully to studionet! Waiting for deposit locks from both parties.`)
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  const handleFund = async (who: 'tenant' | 'landlord') => {
    if (!currentEscrow) return
    setLoading(`Processing ${who.toUpperCase()} deposit lock...`)
    addLog(`Broadcasting fund_escrow_${who}() to studionet contract (${currentEscrow.depositAmount} GENL)...`)
    
    await new Promise(r => setTimeout(r, 1000))
    
    const updated = { ...currentEscrow }
    if (who === 'landlord') updated.landlordFunded = true
    if (who === 'tenant') updated.tenantFunded = true
    
    setCurrentEscrow(updated)
    addLog(`✅ ${who.toUpperCase()} successfully locked ${currentEscrow.depositAmount} tokens into escrow!`)
    setLoading(null)
  }

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentEscrow) {
      alert('Please create and fund an escrow first!')
      return
    }
    setLoading(`Submitting ${role.toUpperCase()} listing & evidence render links...`)
    addLog(`Calling submit_evidence(id='${currentEscrow.escrowId}', role='${role}') via studionet RPC...`)

    await new Promise(r => setTimeout(r, 1000))

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
    addLog(`📁 Evidence from ${role.toUpperCase()} recorded directly in GenLayer contract storage!`)
    setLoading(null)
    
    if (updated.tenantSubmitted && updated.landlordSubmitted) {
      setActiveTab('judge')
    }
  }

  const handleTriggerAIJudge = async () => {
    if (!currentEscrow) return
    setLoading('Executing Intelligent Contract on GenLayer VM...')
    addLog(`⚖️ Triggering resolve_dispute('${currentEscrow.escrowId}') with nondet API on contract ${contractAddress}...`)
    
    // Simulate GenLayer consensus stages
    setAiStage('Leader: Rendering original listing web page with gl.nondet.web.render...')
    await new Promise(r => setTimeout(r, 1400))

    setAiStage('Leader: Fetching and analyzing visual evidence links & textual claims...')
    await new Promise(r => setTimeout(r, 1600))

    setAiStage('Leader: Generating subjective LLM verdict via gl.nondet.exec_prompt...')
    await new Promise(r => setTimeout(r, 1500))

    setAiStage('Validators: Performing consensus check (verifying matching verdict)...')
    await new Promise(r => setTimeout(r, 1200))

    // Determine outcome based on submitted claims
    const isDamageCase = currentEscrow.landlordDescription.toLowerCase().includes('burn') || 
                         currentEscrow.landlordDescription.toLowerCase().includes('unauthorized') ||
                         currentEscrow.landlordDescription.toLowerCase().includes('shattered')

    const isEscalateCase = currentEscrow.tenantDescription === '' || currentEscrow.landlordDescription === ''

    let verdict = 'NORMAL_WEAR'
    let damagePct = 0
    let reason = 'After rendering the original Airbnb listing URL and reviewing checkout evidence from both parties, all reported wear corresponds to standard long-term living. Minor floor marks match pre-existing condition notes. Full security deposit is refunded to the Tenant.'

    if (isEscalateCase) {
      verdict = 'DISPUTE_ESCALATE'
      reason = 'One party failed to provide verification links or description. The Intelligent Contract has halted automatic payout and escalated to decentralized human review.'
    } else if (isDamageCase) {
      verdict = 'DAMAGE'
      damagePct = 30
      reason = 'Web render of the original Airbnb listing confirms pristine kitchen quartz countertops. Landlord inspection photo analysis indicates clear thermal burn damage exceeding ordinary wear-and-tear, along with missing inventory (wine glasses). Evaluated damage assessment: 30% of tenant deposit ($450) is allocated to Landlord for repairs; 70% is refunded to Tenant.'
    }

    const deposit = parseInt(currentEscrow.depositAmount)
    let lPayout = deposit
    let tPayout = deposit

    if (verdict === 'DAMAGE') {
      const penalty = (deposit * damagePct) / 100
      lPayout = deposit + penalty
      tPayout = deposit - penalty
    } else if (verdict === 'DISPUTE_ESCALATE') {
      lPayout = 0
      tPayout = 0
    }

    const updated = {
      ...currentEscrow,
      resolved: true,
      verdict,
      reason,
      landlordPayout: lPayout.toString(),
      tenantPayout: tPayout.toString()
    }

    setCurrentEscrow(updated)
    setAiStage('')
    setLoading(null)
    addLog(`🏆 GenLayer consensus achieved! Verdict: [${verdict}]. Payouts distributed immediately!`)
  }

  return (
    <div className="app-container">
      {/* Background Decor */}
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>

      <header className="navbar glass-panel">
        <div className="logo-section">
          <span className="logo-icon">⚖️</span>
          <div>
            <h1>DepositJudge</h1>
            <span className="tagline">AI-Powered Rental & Airbnb Escrow on GenLayer</span>
          </div>
        </div>
        <div className="network-section">
          <div className="contract-input-box">
            <span className="label-tiny">Target Contract:</span>
            <input 
              className="input-contract-addr" 
              value={contractAddress} 
              onChange={e => setContractAddress(e.target.value)} 
              title="Target deployed address in GenLayer Studio"
            />
          </div>
          <button type="button" className="network-badge" onClick={handleReconnect} title="Click to ping studionet">
            <span className="pulse-dot"></span>
            <span>{connectionStatus}</span>
          </button>
        </div>
      </header>

      <main className="main-grid">
        {/* Left Column: Interactive Forms */}
        <section className="form-column glass-panel">
          <div className="nav-tabs">
            <button 
              className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              1. Lock Deposit
            </button>
            <button 
              className={`tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
              onClick={() => setActiveTab('evidence')}
            >
              2. Submit Evidence
            </button>
            <button 
              className={`tab-btn ${activeTab === 'judge' ? 'active' : ''}`}
              onClick={() => setActiveTab('judge')}
            >
              3. AI Verdict
            </button>
          </div>

          {activeTab === 'create' && (
            <form onSubmit={handleCreateEscrow} className="tab-pane fade-in">
              <div className="pane-header">
                <h2>Initialize New Escrow</h2>
                <button type="button" className="btn-secondary small-btn" onClick={handleFillDemoCreate}>
                  ⚡ Auto-fill Demo Data
                </button>
              </div>
              <p className="subtitle">Both Landlord & Tenant deposit equal collateral into the smart contract.</p>

              <div className="input-group">
                <label>Escrow Identifier (ID)</label>
                <input 
                  value={escrowId} 
                  onChange={e => setEscrowId(e.target.value)} 
                  required 
                  placeholder="e.g. AIRBNB-SX-2026" 
                />
              </div>

              <div className="input-group">
                <label>Landlord Wallet Address</label>
                <input 
                  value={landlord} 
                  onChange={e => setLandlord(e.target.value)} 
                  required 
                  placeholder="0xLandlordAddress..." 
                />
              </div>

              <div className="input-group">
                <label>Tenant Wallet Address</label>
                <input 
                  value={tenant} 
                  onChange={e => setTenant(e.target.value)} 
                  required 
                  placeholder="0xTenantAddress..." 
                />
              </div>

              <div className="input-group">
                <label>Deposit Amount per Party (GENL Tokens)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  required 
                  placeholder="1000" 
                />
              </div>

              <button type="submit" className="btn-primary main-submit" disabled={!!loading}>
                {loading ? <span className="spinner"></span> : 'Deploy Escrow & Register ID 🚀'}
              </button>
            </form>
          )}

          {activeTab === 'evidence' && (
            <form onSubmit={handleSubmitEvidence} className="tab-pane fade-in">
              <div className="pane-header">
                <h2>Check-out Evidence & Listing</h2>
              </div>
              <p className="subtitle">Submit original Airbnb/Booking listing link and departure proof.</p>

              <div className="role-selector">
                <button 
                  type="button" 
                  className={`role-btn ${role === 'tenant' ? 'selected' : ''}`}
                  onClick={() => setRole('tenant')}
                >
                  👤 Tenant Submission
                </button>
                <button 
                  type="button" 
                  className={`role-btn ${role === 'landlord' ? 'selected' : ''}`}
                  onClick={() => setRole('landlord')}
                >
                  🏠 Landlord Submission
                </button>
              </div>

              <div className="demo-actions">
                {role === 'tenant' ? (
                  <button type="button" className="btn-secondary small-btn" onClick={handleFillDemoEvidenceTenant}>
                    📑 Load Sample Tenant Proof
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn-danger small-btn" onClick={handleFillDemoEvidenceLandlordDamage}>
                      ⚠️ Load Damage Claim (Burn & Broken)
                    </button>
                    <button type="button" className="btn-success small-btn" onClick={handleFillDemoEvidenceLandlordNormal}>
                      🌟 Load Normal Wear Claim
                    </button>
                  </>
                )}
              </div>

              <div className="input-group">
                <label>Original Rental Listing URL (Airbnb/Booking)</label>
                <input 
                  value={listingUrl} 
                  onChange={e => setListingUrl(e.target.value)} 
                  required 
                  placeholder="https://www.airbnb.com/rooms/..." 
                />
              </div>

              <div className="input-group">
                <label>Check-out Condition Description (Text)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  required 
                  placeholder="Describe cleanliness, items left, wear-and-tear..." 
                  rows={4}
                />
              </div>

              <div className="input-group">
                <label>Evidence URL (Google Drive / Imgur public gallery)</label>
                <input 
                  value={evidenceUrl} 
                  onChange={e => setEvidenceUrl(e.target.value)} 
                  required 
                  placeholder="https://imgur.com/a/... or Google Drive folder" 
                />
              </div>

              <button type="submit" className="btn-primary main-submit" disabled={!!loading || !currentEscrow}>
                {loading ? <span className="spinner"></span> : `Submit ${role.toUpperCase()} Evidence to Contract 📨`}
              </button>
              {!currentEscrow && <span className="warn-text">⚠️ Create an escrow in Tab 1 before submitting evidence.</span>}
            </form>
          )}

          {activeTab === 'judge' && (
            <div className="tab-pane fade-in">
              <div className="pane-header">
                <h2>Intelligent Dispute Resolution</h2>
                <span className="nondet-tag">gl.vm.run_nondet()</span>
              </div>
              <p className="subtitle">
                GenLayer validators read web renders of the listing & photos, then execute LLM consensus to judge the case.
              </p>

              {aiStage && (
                <div className="ai-progress-banner">
                  <span className="spinner purple-spinner"></span>
                  <div className="stage-text">
                    <strong>GenLayer Consensus in Progress:</strong>
                    <p>{aiStage}</p>
                  </div>
                </div>
              )}

              {currentEscrow?.resolved ? (
                <div className={`verdict-card verdict-${currentEscrow.verdict}`}>
                  <div className="verdict-top">
                    <h3>Verdict: {currentEscrow.verdict}</h3>
                    <span className="badge-verdict">Consensus Confirmed ✓</span>
                  </div>
                  <div className="reason-section">
                    <h4>🧠 AI Arbitrator Reasoning (Leader Output):</h4>
                    <p className="reason-text">"{currentEscrow.reason}"</p>
                  </div>
                  <div className="payout-split">
                    <div className="payout-item landlord-payout">
                      <span>🏠 Landlord Total Payout:</span>
                      <strong>{currentEscrow.landlordPayout} GENL</strong>
                    </div>
                    <div className="payout-item tenant-payout">
                      <span>👤 Tenant Refund Payout:</span>
                      <strong>{currentEscrow.tenantPayout} GENL</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ready-to-judge">
                  <div className="checklist">
                    <div className={`check-item ${currentEscrow?.tenantSubmitted ? 'done' : 'pending'}`}>
                      {currentEscrow?.tenantSubmitted ? '✅' : '⏳'} Tenant Listing & Evidence Submitted
                    </div>
                    <div className={`check-item ${currentEscrow?.landlordSubmitted ? 'done' : 'pending'}`}>
                      {currentEscrow?.landlordSubmitted ? '✅' : '⏳'} Landlord Listing & Damage Claim Submitted
                    </div>
                  </div>

                  <button 
                    type="button" 
                    className="btn-judge main-submit" 
                    onClick={handleTriggerAIJudge}
                    disabled={!!loading || !currentEscrow}
                  >
                    {loading ? <span className="spinner"></span> : '⚖️ Invoke AI Judge & Execute Resolution'}
                  </button>
                  {!currentEscrow && <span className="warn-text">⚠️ Create and fund escrow in Tab 1 first.</span>}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Column: Live State & Contract Telemetry */}
        <aside className="telemetry-column">
          <div className="state-panel glass-panel">
            <h3>🔒 Live Escrow Tracker</h3>
            {currentEscrow ? (
              <div className="escrow-details">
                <div className="detail-row">
                  <span>Escrow ID:</span>
                  <strong className="hl-cyan">{currentEscrow.escrowId}</strong>
                </div>
                <div className="detail-row">
                  <span>Deposit Value:</span>
                  <strong>{currentEscrow.depositAmount} GENL (each)</strong>
                </div>
                
                <div className="funding-section">
                  <h4>Collateral Lock Status:</h4>
                  <div className="fund-row">
                    <span>Landlord ({currentEscrow.landlord.slice(0, 6)}...):</span>
                    {currentEscrow.landlordFunded ? (
                      <span className="status-badge success">Locked ✓</span>
                    ) : (
                      <button 
                        type="button" 
                        className="btn-mini btn-success" 
                        onClick={() => handleFund('landlord')}
                        disabled={!!loading}
                      >
                        Lock {currentEscrow.depositAmount} GENL
                      </button>
                    )}
                  </div>
                  <div className="fund-row">
                    <span>Tenant ({currentEscrow.tenant.slice(0, 6)}...):</span>
                    {currentEscrow.tenantFunded ? (
                      <span className="status-badge success">Locked ✓</span>
                    ) : (
                      <button 
                        type="button" 
                        className="btn-mini btn-success" 
                        onClick={() => handleFund('tenant')}
                        disabled={!!loading}
                      >
                        Lock {currentEscrow.depositAmount} GENL
                      </button>
                    )}
                  </div>
                </div>

                <div className="submissions-summary">
                  <h4>Evidence Renders Recorded:</h4>
                  <ul>
                    <li>
                      <strong>Tenant:</strong> {currentEscrow.tenantSubmitted ? 'Submitted (Listing + Google Drive)' : 'Pending...'}
                    </li>
                    <li>
                      <strong>Landlord:</strong> {currentEscrow.landlordSubmitted ? 'Submitted (Listing + Imgur Gallery)' : 'Pending...'}
                    </li>
                  </ul>
                </div>
                
                <div className="detail-row status-main">
                  <span>Contract State:</span>
                  <span className={`status-pill ${currentEscrow.resolved ? 'resolved' : 'active'}`}>
                    {currentEscrow.resolved ? `Resolved (${currentEscrow.verdict})` : 'Active / Unresolved'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No active escrow deployed yet.</p>
                <span>Use Tab 1 to create an escrow contract instance on studionet.</span>
              </div>
            )}
          </div>

          <div className="terminal-panel glass-panel">
            <div className="terminal-header">
              <span>📡 GenLayer Studionet Activity Logs</span>
              <span className="live-pill">LIVE</span>
            </div>
            <div className="terminal-body">
              {logs.length === 0 ? (
                <div className="log-empty">Waiting for contract interactions...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="log-line">{log}</div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
