# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
from dataclasses import dataclass

@allow_storage
@dataclass
class Escrow:
    landlord: Address
    tenant: Address
    deposit_amount: bigint
    landlord_funded: bool
    tenant_funded: bool
    tenant_evidence_submitted: bool
    tenant_listing_url: str
    tenant_description: str
    tenant_evidence_url: str
    landlord_evidence_submitted: bool
    landlord_listing_url: str
    landlord_description: str
    landlord_evidence_url: str
    resolved: bool
    verdict: str       # NORMAL_WEAR, DAMAGE, or DISPUTE_ESCALATE
    reason: str        # Detailed AI explanation from LLM
    landlord_payout: bigint
    tenant_payout: bigint

class Contract(gl.Contract):
    escrows: TreeMap[str, Escrow]

    def __init__(self):
        pass
        
    @gl.public.write.payable
    def create_escrow(self, escrow_id: str, landlord: str, tenant: str) -> str:
        amount = gl.message.value
        sender = gl.message.sender_address
        if amount <= bigint(0):
            raise UserError("Deposit amount must be greater than 0")
        if escrow_id in self.escrows:
            raise UserError("Escrow ID already exists")
        
        landlord_addr = Address(str(landlord))
        tenant_addr = Address(str(tenant))
        
        if sender != landlord_addr and sender != tenant_addr:
            raise UserError("Authentication failed: Caller must be either the designated Landlord or Tenant")
        if landlord_addr == tenant_addr:
            raise UserError("Landlord and Tenant cannot be the same address")
        
        self.escrows[escrow_id] = Escrow(
            landlord=landlord_addr,
            tenant=tenant_addr,
            deposit_amount=amount,
            landlord_funded=True,
            tenant_funded=True,
            tenant_evidence_submitted=False,
            tenant_listing_url="",
            tenant_description="",
            tenant_evidence_url="",
            landlord_evidence_submitted=False,
            landlord_listing_url="",
            landlord_description="",
            landlord_evidence_url="",
            resolved=False,
            verdict="",
            reason="",
            landlord_payout=bigint(0),
            tenant_payout=bigint(0)
        )
        return escrow_id

    @gl.public.write
    def submit_evidence(self, escrow_id: str, role: str, listing_url: str, description: str, evidence_url: str) -> None:
        if escrow_id not in self.escrows:
            raise UserError("Escrow not found")
        escrow = self.escrows[escrow_id]
        if not escrow.landlord_funded or not escrow.tenant_funded:
            raise UserError("Escrow must be funded by both Landlord and Tenant before submitting evidence")
        if escrow.resolved:
            raise UserError("Escrow dispute has already been resolved")
            
        sender = gl.message.sender_address
        if sender != escrow.tenant and sender != escrow.landlord:
            raise UserError("Authentication failed: Only authenticated escrow participants can submit evidence")

        clean_role = role.strip().lower()
        if clean_role == "tenant":
            escrow.tenant_listing_url = listing_url
            escrow.tenant_description = description
            escrow.tenant_evidence_url = evidence_url
            escrow.tenant_evidence_submitted = True
        elif clean_role == "landlord":
            escrow.landlord_listing_url = listing_url
            escrow.landlord_description = description
            escrow.landlord_evidence_url = evidence_url
            escrow.landlord_evidence_submitted = True
        else:
            raise UserError("Role must be strictly 'tenant' or 'landlord'")
            
        self.escrows[escrow_id] = escrow

    @gl.public.write
    def resolve_dispute(self, escrow_id: str) -> None:
        if escrow_id not in self.escrows:
            raise UserError("Escrow not found")
        escrow = self.escrows[escrow_id]
        if escrow.resolved:
            raise UserError("Escrow dispute already resolved")
        if not escrow.tenant_evidence_submitted and not escrow.landlord_evidence_submitted:
            raise UserError("At least one party must submit evidence before triggering AI judge resolution")

        sender = gl.message.sender_address
        if sender != escrow.landlord and sender != escrow.tenant:
            raise UserError("Authentication failed: Only the authenticated Landlord or Tenant can invoke AI Tribunal resolution and fund settlement")

        # Extract storage fields to local strings before entering nondeterministic lambda
        t_listing = str(escrow.tenant_listing_url)
        l_listing = str(escrow.landlord_listing_url)
        t_desc = str(escrow.tenant_description)
        l_desc = str(escrow.landlord_description)
        t_ev_url = str(escrow.tenant_evidence_url)
        l_ev_url = str(escrow.landlord_evidence_url)

        def leader_fn():
            target_listing = l_listing if l_listing != "" else t_listing
            try:
                if target_listing != "":
                    res = gl.nondet.web.render(target_listing, mode="text")
                    listing_text = res.content if hasattr(res, "content") else str(res)
                else:
                    listing_text = "No original listing URL provided."
            except Exception as e:
                listing_text = f"Network or render error for listing: {str(e)}"

            try:
                if t_ev_url != "":
                    t_res = gl.nondet.web.render(t_ev_url, mode="text")
                    tenant_ev_text = t_res.content if hasattr(t_res, "content") else str(t_res)
                else:
                    tenant_ev_text = "No tenant evidence URL provided."
            except Exception as e:
                tenant_ev_text = f"Network or render error for tenant evidence: {str(e)}"

            try:
                if l_ev_url != "":
                    l_res = gl.nondet.web.render(l_ev_url, mode="text")
                    landlord_ev_text = l_res.content if hasattr(l_res, "content") else str(l_res)
                else:
                    landlord_ev_text = "No landlord evidence URL provided."
            except Exception as e:
                landlord_ev_text = f"Network or render error for landlord evidence: {str(e)}"
            
            prompt = f"""
            You are an impartial AI Chief Justice representing the DepositJudge decentralized escrow protocol on the GenLayer network.
            Evaluate a residential tenancy deposit dispute based strictly on the submitted evidence and records.
            
            === ORIGINAL LISTING DATA ===
            {listing_text[:1500]}
            
            === TENANT SUBMISSION ===
            Check-out Condition Description: {t_desc}
            Evidence Render Content: {tenant_ev_text[:1500]}
            
            === LANDLORD SUBMISSION ===
            Check-out Condition Description: {l_desc}
            Evidence Render Content: {landlord_ev_text[:1500]}
            
            === DECISION RULES FOR CONSENSUS ===
            To ensure clear agreement across validator nodes, apply these objective rules in strict order:
            1. If the Landlord presents specific claims of material damage (e.g., gouges, cuts, chemical stains, broken furniture, or pet policy violations), and the Tenant's description merely offers a general claim of cleanliness without disproving the specific damage, you MUST rule "DAMAGE" with damage_percent = 50 and explain that material damage claims require compensation.
            2. If neither party claims material physical damage, or if minor surface wear (dust, normal carpet walking) is reported, you MUST rule "NORMAL_WEAR" with damage_percent = 0.
            3. If the URLs or descriptions contain severe contradictions, unverified test strings, or incomprehensible text where damage cannot be ascertained, rule "DISPUTE_ESCALATE" with damage_percent = 0.
            
            You MUST respond with ONLY a JSON object:

            {{"verdict": "NORMAL_WEAR|DAMAGE|DISPUTE_ESCALATE", "damage_percent": 0, "reason": "your thorough reasoning"}}
            """
            
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            if hasattr(res, 'calldata') and isinstance(res.calldata, dict):
                return res.calldata
            try:
                text = res.content if hasattr(res, "content") else str(res)
                return self._parse_llm_json(text)
            except Exception:
                return {"verdict": "NORMAL_WEAR", "damage_percent": 0, "reason": "Fallback to NORMAL_WEAR on AI JSON parse error."}

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader_data = leader_res.calldata if hasattr(leader_res, "calldata") else leader_res
            if not isinstance(leader_data, dict):
                try:
                    leader_data = self._parse_llm_json(str(leader_data))
                except Exception:
                    leader_data = {"verdict": "NORMAL_WEAR"}
                    
            mine_data = leader_fn()
            v_leader = str(leader_data.get("verdict", "")).upper().strip()
            v_mine = str(mine_data.get("verdict", "")).upper().strip()
            return v_leader == v_mine
            
        result = gl.vm.run_nondet(leader_fn, validator_fn)
        if not isinstance(result, dict):
            try:
                result = self._parse_llm_json(str(result))
            except Exception:
                result = {"verdict": "DISPUTE_ESCALATE", "damage_percent": 0, "reason": "Failed to parse AI response."}
        
        verdict_str = str(result.get("verdict", "DISPUTE_ESCALATE")).upper()
        reason_str = str(result.get("reason", "No reasoning generated."))
        try:
            damage_pct = int(result.get("damage_percent", 0))
        except Exception:
            damage_pct = 0
            
        if damage_pct < 0:
            damage_pct = 0
        if damage_pct > 100:
            damage_pct = 100
            
        if verdict_str == "NORMAL_WEAR":
            escrow.landlord_payout = bigint(0)
            escrow.tenant_payout = escrow.deposit_amount
            gl.get_contract_at(Address(str(escrow.tenant))).emit_transfer(value=escrow.deposit_amount)
        elif verdict_str == "DAMAGE":
            penalty = (escrow.deposit_amount * bigint(damage_pct)) // bigint(100)
            tenant_rem = escrow.deposit_amount - penalty
            escrow.landlord_payout = penalty
            escrow.tenant_payout = tenant_rem
            if penalty > bigint(0):
                gl.get_contract_at(Address(str(escrow.landlord))).emit_transfer(value=penalty)
            if tenant_rem > bigint(0):
                gl.get_contract_at(Address(str(escrow.tenant))).emit_transfer(value=tenant_rem)
        else:
            # DISPUTE_ESCALATE
            escrow.landlord_payout = bigint(0)
            escrow.tenant_payout = escrow.deposit_amount
            gl.get_contract_at(Address(str(escrow.tenant))).emit_transfer(value=escrow.deposit_amount)

        escrow.verdict = verdict_str
        escrow.reason = reason_str
        escrow.resolved = True
        self.escrows[escrow_id] = escrow

    @gl.public.view
    def get_escrow(self, escrow_id: str) -> str:
        if escrow_id not in self.escrows:
            raise UserError("Escrow not found")
        escrow = self.escrows[escrow_id]
        data = {
            "landlord": str(escrow.landlord),
            "tenant": str(escrow.tenant),
            "deposit_amount": str(escrow.deposit_amount),
            "landlord_funded": escrow.landlord_funded,
            "tenant_funded": escrow.tenant_funded,
            "tenant_evidence_submitted": escrow.tenant_evidence_submitted,
            "tenant_listing_url": escrow.tenant_listing_url,
            "tenant_description": escrow.tenant_description,
            "tenant_evidence_url": escrow.tenant_evidence_url,
            "landlord_evidence_submitted": escrow.landlord_evidence_submitted,
            "landlord_listing_url": escrow.landlord_listing_url,
            "landlord_description": escrow.landlord_description,
            "landlord_evidence_url": escrow.landlord_evidence_url,
            "resolved": escrow.resolved,
            "verdict": escrow.verdict,
            "reason": escrow.reason,
            "landlord_payout": str(escrow.landlord_payout),
            "tenant_payout": str(escrow.tenant_payout)
        }
        return json.dumps(data)

    def _parse_llm_json(self, text) -> dict:
        if isinstance(text, dict):
            return text
        if hasattr(text, '__dict__'):
            return text.__dict__
        import json
        text = str(text).strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())
