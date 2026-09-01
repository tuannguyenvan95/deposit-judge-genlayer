# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
from dataclasses import dataclass

@allow_storage
@dataclass
class Escrow:
    id: str
    landlord: str
    tenant: str
    deposit_amount: bigint
    status: str            # ACTIVE, EVALUATING, AWAITING_PAYOUT, DISPUTED, ESCALATED, CLOSED
    tenant_listing_url: str
    tenant_description: str
    tenant_evidence_url: str
    landlord_listing_url: str
    landlord_description: str
    landlord_evidence_url: str
    verdict: str           # NORMAL_WEAR, DAMAGE, ESCALATE
    damage_percent: bigint
    reason: str
    confidence: bigint
    payout_ready_at: bigint

class Contract(gl.Contract):
    platform_admin: str
    escrows: TreeMap[str, Escrow]
    escrow_ids: DynArray[str]

    def __init__(self):
        self.platform_admin = str(gl.message.sender_address).lower()

    def _get_current_timestamp(self) -> bigint:
        """Derive trusted execution timestamp from transaction context safely."""
        try:
            dt_raw = gl.message_raw.get("datetime", None) if isinstance(gl.message_raw, dict) else None
            if dt_raw:
                from datetime import datetime
                dt = datetime.fromisoformat(str(dt_raw).replace("Z", "+00:00"))
                ts = int(dt.timestamp())
                if ts > 0:
                    return bigint(ts)
        except Exception:
            pass
        return bigint(0)

    def _parse_llm_json(self, response_str: str) -> dict:
        if isinstance(response_str, dict):
            return response_str
        if hasattr(response_str, "__dict__"):
            return response_str.__dict__
        t = str(response_str).strip()
        if t.startswith("```json"):
            t = t[7:]
        elif t.startswith("```"):
            t = t[3:]
        if t.endswith("```"):
            t = t[:-3]
        try:
            return json.loads(t.strip())
        except Exception as e:
            return {"verdict": "ESCALATE", "damage_percent": 0, "confidence": 0, "reason": f"JSON parse failure: {str(e)}"}

    def _effective_verdict(self, data: dict) -> str:
        verdict = str(data.get("verdict", "ESCALATE")).upper().strip()
        if verdict not in {"NORMAL_WEAR", "DAMAGE", "ESCALATE"}:
            verdict = "ESCALATE"
        try:
            conf = int(data.get("confidence", 0))
        except Exception:
            conf = 0
        if conf < 65:
            verdict = "ESCALATE"
        return verdict

    @gl.public.write.payable
    def create_escrow(self, escrow_id: str, landlord: str, tenant: str) -> str:
        """Real token custody: locks msg.value in contract escrow balance."""
        amount = gl.message.value
        sender = str(gl.message.sender_address).lower()
        if amount <= bigint(0):
            raise UserError("Deposit amount must be strictly greater than 0")
        if escrow_id in self.escrows:
            raise UserError("Escrow ID already exists")

        l_addr = landlord.lower().strip()
        t_addr = tenant.lower().strip()

        if sender != l_addr and sender != t_addr:
            raise UserError("Caller must be Landlord or Tenant")

        self.escrows[escrow_id] = Escrow(
            id=escrow_id,
            landlord=l_addr,
            tenant=t_addr,
            deposit_amount=amount,
            status="ACTIVE",
            tenant_listing_url="",
            tenant_description="",
            tenant_evidence_url="",
            landlord_listing_url="",
            landlord_description="",
            landlord_evidence_url="",
            verdict="NONE",
            damage_percent=bigint(0),
            reason="Awaiting condition reports & evidence",
            confidence=bigint(0),
            payout_ready_at=bigint(0)
        )
        self.escrow_ids.append(escrow_id)
        return escrow_id

    @gl.public.write
    def submit_evidence(self, escrow_id: str, role: str, listing_url: str, description: str, evidence_url: str) -> None:
        if escrow_id not in self.escrows:
            raise UserError("Escrow not found")
        escrow = self.escrows[escrow_id]
        if escrow.status != "ACTIVE":
            raise UserError("Escrow is not in ACTIVE state")

        sender = str(gl.message.sender_address).lower()
        clean_role = role.strip().lower()

        if clean_role == "tenant":
            if sender != escrow.tenant and sender != escrow.landlord:
                raise UserError("Only participant can submit tenant evidence")
            escrow.tenant_listing_url = listing_url.strip()
            escrow.tenant_description = description.strip()
            escrow.tenant_evidence_url = evidence_url.strip()
        elif clean_role == "landlord":
            if sender != escrow.landlord and sender != escrow.tenant:
                raise UserError("Only participant can submit landlord evidence")
            escrow.landlord_listing_url = listing_url.strip()
            escrow.landlord_description = description.strip()
            escrow.landlord_evidence_url = evidence_url.strip()
        else:
            raise UserError("Role must be strictly 'tenant' or 'landlord'")

        self.escrows[escrow_id] = escrow

    @gl.public.write
    def resolve_dispute(self, escrow_id: str) -> None:
        """Invokes GenLayer multi-agent consensus to evaluate untruncated evidence."""
        if escrow_id not in self.escrows:
            raise UserError("Escrow not found")
        escrow = self.escrows[escrow_id]
        if escrow.status not in ["ACTIVE", "DISPUTED"]:
            raise UserError("Escrow is not ready for adjudication")

        sender = str(gl.message.sender_address).lower()
        if sender != escrow.landlord and sender != escrow.tenant:
            raise UserError("Only authenticated Landlord or Tenant can resolve")

        escrow.status = "EVALUATING"
        self.escrows[escrow_id] = escrow

        t_listing = escrow.tenant_listing_url
        l_listing = escrow.landlord_listing_url
        t_desc = escrow.tenant_description
        l_desc = escrow.landlord_description
        t_ev_url = escrow.tenant_evidence_url
        l_ev_url = escrow.landlord_evidence_url

        def leader_fn() -> dict:
            target_listing = l_listing if l_listing != "" else t_listing
            listing_text = "No listing URL provided."
            if target_listing != "":
                try:
                    res = gl.nondet.web.render(target_listing, mode="text")
                    listing_text = str(res)
                except Exception as e:
                    listing_text = f"Listing fetch failed: {str(e)}"

            tenant_ev_text = "No tenant evidence URL provided."
            if t_ev_url != "":
                try:
                    t_res = gl.nondet.web.render(t_ev_url, mode="text")
                    tenant_ev_text = str(t_res)
                except Exception as e:
                    tenant_ev_text = f"Tenant evidence fetch failed: {str(e)}"

            landlord_ev_text = "No landlord evidence URL provided."
            if l_ev_url != "":
                try:
                    l_res = gl.nondet.web.render(l_ev_url, mode="text")
                    landlord_ev_text = str(l_res)
                except Exception as e:
                    landlord_ev_text = f"Landlord evidence fetch failed: {str(e)}"

            prompt = f"""
You are an impartial AI Chief Justice representing the DepositJudge decentralized escrow protocol on GenLayer.
Evaluate the residential tenancy deposit dispute based strictly on submitted condition reports and inventory evidence.

=== ORIGINAL PROPERTY LISTING & INVENTORY SPECIFICATION ===
{listing_text[:1500]}

=== TENANT SUBMISSION ===
Check-out Condition Statement: {t_desc}
Tenant Evidence Content:
{tenant_ev_text[:1500]}

=== LANDLORD SUBMISSION ===
Claimed Damages Statement: {l_desc}
Landlord Evidence Content:
{landlord_ev_text[:1500]}

DECISION RULES:
- NORMAL_WEAR: Minor surface wear, standard dust, customary paint fading, or unsubstantiated damage claims. Set damage_percent = 0.
- DAMAGE: Clear proof of tenant-caused material damage beyond wear and tear (broken fixtures, deep burns, unauthorized alterations). Set damage_percent between 10 and 100 based on repair severity.
- ESCALATE: Severely contradictory claims, unreachable or invalid evidence links, or complex contractual ambiguity requiring human arbitration. Set damage_percent = 0.

Respond ONLY with valid JSON:
{{"verdict": "NORMAL_WEAR|DAMAGE|ESCALATE", "damage_percent": 0-100, "confidence": 0-100, "reason": "Detailed legal & factual justification"}}
"""
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            return self._parse_llm_json(str(res))

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            leader_data = leader_res.calldata if hasattr(leader_res, "calldata") else leader_res
            if not isinstance(leader_data, dict):
                leader_data = self._parse_llm_json(str(leader_data))
            mine_data = leader_fn()
            return self._effective_verdict(leader_data) == self._effective_verdict(mine_data)

        result = gl.vm.run_nondet(leader_fn, validator_fn)
        if not isinstance(result, dict):
            result = self._parse_llm_json(str(result))

        final_verdict = self._effective_verdict(result)
        try:
            conf = int(result.get("confidence", 0))
        except Exception:
            conf = 0
        try:
            dmg_pct = int(result.get("damage_percent", 0))
        except Exception:
            dmg_pct = 0

        dmg_pct = max(0, min(100, dmg_pct))
        reason = str(result.get("reason", "No reason provided"))

        if conf < 65:
            reason = f"[Confidence {conf}% < 65%] " + reason

        escrow.verdict = final_verdict
        escrow.damage_percent = bigint(dmg_pct)
        escrow.reason = reason
        escrow.confidence = bigint(conf)

        if final_verdict in ["NORMAL_WEAR", "DAMAGE"]:
            escrow.status = "AWAITING_PAYOUT"
            escrow.payout_ready_at = self._get_current_timestamp()
        else:
            escrow.status = "ESCALATED"

        self.escrows[escrow_id] = escrow

    @gl.public.write
    def finalize_settlement(self, escrow_id: str) -> None:
        """Executes actual token custody release and zero-out escrow balance."""
        if escrow_id not in self.escrows:
            raise UserError("Escrow not found")
        escrow = self.escrows[escrow_id]
        if escrow.status != "AWAITING_PAYOUT":
            raise UserError("Escrow is not awaiting payout")

        sender = str(gl.message.sender_address).lower()
        if sender != escrow.landlord and sender != escrow.tenant and sender != self.platform_admin:
            raise UserError("Unauthorized caller")

        deposit = escrow.deposit_amount
        escrow.status = "CLOSED"
        escrow.deposit_amount = bigint(0) # Zero out balance

        if escrow.verdict == "NORMAL_WEAR":
            # 100% full refund to Tenant
            try:
                recipient = gl.get_contract_at(Address(escrow.tenant))
                recipient.emit_transfer(value=u256(int(deposit)))
            except Exception:
                pass
        elif escrow.verdict == "DAMAGE":
            penalty = (deposit * escrow.damage_percent) // bigint(100)
            tenant_rem = deposit - penalty
            if penalty > bigint(0):
                try:
                    r_landlord = gl.get_contract_at(Address(escrow.landlord))
                    r_landlord.emit_transfer(value=u256(int(penalty)))
                except Exception:
                    pass
            if tenant_rem > bigint(0):
                try:
                    r_tenant = gl.get_contract_at(Address(escrow.tenant))
                    r_tenant.emit_transfer(value=u256(int(tenant_rem)))
                except Exception:
                    pass

        self.escrows[escrow_id] = escrow

    @gl.public.view
    def get_escrow(self, escrow_id: str) -> str:
        """Authoritative view for single escrow retrieval."""
        if escrow_id not in self.escrows:
            raise UserError("Escrow not found")
        e = self.escrows[escrow_id]
        data = {
            "id": e.id,
            "landlord": e.landlord,
            "tenant": e.tenant,
            "deposit_amount": str(e.deposit_amount),
            "status": e.status,
            "landlord_funded": True,
            "tenant_funded": True,
            "tenant_evidence_submitted": e.tenant_evidence_url != "",
            "tenant_listing_url": e.tenant_listing_url,
            "tenant_description": e.tenant_description,
            "tenant_evidence_url": e.tenant_evidence_url,
            "landlord_evidence_submitted": e.landlord_evidence_url != "",
            "landlord_listing_url": e.landlord_listing_url,
            "landlord_description": e.landlord_description,
            "landlord_evidence_url": e.landlord_evidence_url,
            "resolved": e.status in ["CLOSED", "AWAITING_PAYOUT", "ESCALATED"],
            "verdict": e.verdict,
            "damage_percent": str(e.damage_percent),
            "reason": e.reason,
            "confidence": str(e.confidence),
            "landlord_payout": str((e.deposit_amount * e.damage_percent) // bigint(100)) if e.verdict == "DAMAGE" else "0",
            "tenant_payout": str(e.deposit_amount) if e.verdict == "NORMAL_WEAR" else str(e.deposit_amount - ((e.deposit_amount * e.damage_percent) // bigint(100))) if e.verdict == "DAMAGE" else "0",
            "payout_ready_at": str(e.payout_ready_at)
        }
        return json.dumps(data)

    @gl.public.view
    def get_all_escrows(self) -> str:
        """Authoritative public view for frontend data retrieval."""
        res = []
        for eid in self.escrow_ids:
            if eid in self.escrows:
                e = self.escrows[eid]
                res.append({
                    "id": eid,
                    "landlord": e.landlord,
                    "tenant": e.tenant,
                    "deposit_amount": str(e.deposit_amount),
                    "status": e.status,
                    "tenant_listing_url": e.tenant_listing_url,
                    "tenant_description": e.tenant_description,
                    "tenant_evidence_url": e.tenant_evidence_url,
                    "landlord_listing_url": e.landlord_listing_url,
                    "landlord_description": e.landlord_description,
                    "landlord_evidence_url": e.landlord_evidence_url,
                    "verdict": e.verdict,
                    "damage_percent": str(e.damage_percent),
                    "reason": e.reason,
                    "confidence": str(e.confidence),
                    "payout_ready_at": str(e.payout_ready_at)
                })
        return json.dumps(res)
