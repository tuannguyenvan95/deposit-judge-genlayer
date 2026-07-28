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

@contract
class Contract:
    escrows: TreeMap[str, Escrow]

    def __init__(self):
        # TUYỆT ĐỐI CẤM reassign TreeMap() / DynArray() trong __init__ theo quy tắc GenLayer
        pass
        
    def create_escrow(self, escrow_id: str, landlord: Address, tenant: Address, amount: bigint) -> bool:
        if escrow_id in self.escrows:
            raise Exception("Escrow ID already exists")
        
        self.escrows[escrow_id] = Escrow(
            landlord=landlord,
            tenant=tenant,
            deposit_amount=amount,
            landlord_funded=False,
            tenant_funded=False,
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
        return True

    def fund_escrow_landlord(self, escrow_id: str) -> bool:
        escrow = self.escrows.get(escrow_id)
        if escrow is None:
            raise Exception("Escrow not found")
        escrow.landlord_funded = True
        self.escrows[escrow_id] = escrow
        return True

    def fund_escrow_tenant(self, escrow_id: str) -> bool:
        escrow = self.escrows.get(escrow_id)
        if escrow is None:
            raise Exception("Escrow not found")
        escrow.tenant_funded = True
        self.escrows[escrow_id] = escrow
        return True

    def submit_evidence(self, escrow_id: str, role: str, listing_url: str, description: str, evidence_url: str) -> bool:
        escrow = self.escrows.get(escrow_id)
        if escrow is None:
            raise Exception("Escrow not found")
        if not escrow.landlord_funded or not escrow.tenant_funded:
            raise Exception("Escrow must be funded by both Landlord and Tenant before submitting evidence")
        if escrow.resolved:
            raise Exception("Escrow dispute has already been resolved")
            
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
            raise Exception("Role must be strictly 'tenant' or 'landlord'")
            
        self.escrows[escrow_id] = escrow
        return True

    def resolve_dispute(self, escrow_id: str) -> str:
        escrow = self.escrows.get(escrow_id)
        if escrow is None:
            raise Exception("Escrow not found")
        if escrow.resolved:
            raise Exception("Escrow dispute already resolved")
        if not escrow.tenant_evidence_submitted and not escrow.landlord_evidence_submitted:
            raise Exception("At least one party must submit evidence before triggering AI judge resolution")

        def leader_fn():
            # 1. Dùng nondet.web.render đọc URL listing gốc (Airbnb/Booking)
            target_listing = escrow.landlord_listing_url if escrow.landlord_listing_url != "" else escrow.tenant_listing_url
            listing_html = nondet.web.render(target_listing) if target_listing != "" else "No original listing URL provided."
            
            # 2. Dùng nondet.web.render đọc URL ảnh/evidence (Google Drive / Imgur) của 2 bên
            tenant_ev_html = nondet.web.render(escrow.tenant_evidence_url) if escrow.tenant_evidence_url != "" else "No tenant evidence URL provided."
            landlord_ev_html = nondet.web.render(escrow.landlord_evidence_url) if escrow.landlord_evidence_url != "" else "No landlord evidence URL provided."
            
            prompt = f"""
            You are an AI judge representing the DepositJudge decentralized escrow protocol on the GenLayer network.
            Your duty is to subjectively evaluate a rental property check-out dispute by examining the original listing against both parties' submissions and evidence web renders.
            
            === ORIGINAL LISTING DATA ===
            {listing_html[:1500]}
            
            === TENANT SUBMISSION ===
            Check-out Condition Description: {escrow.tenant_description}
            Evidence Render Content: {tenant_ev_html[:1200]}
            
            === LANDLORD SUBMISSION ===
            Check-out Condition Description: {escrow.landlord_description}
            Evidence Render Content: {landlord_ev_html[:1200]}
            
            === RESOLUTION GUIDELINES ===
            Determine the fair verdict among these 3 strict categories:
            - "NORMAL_WEAR": Minor scuffs or expected usage. Return full deposit to Tenant. Damage percent = 0.
            - "DAMAGE": Excessive harm, broken appliances, or policy breaches proven by Landlord. Set damage percent between 1 and 100 based on severity.
            - "DISPUTE_ESCALATE": Unresolved contradictions, incomplete links, or potential fraud that requires human escalation.
            
            Respond strictly in valid JSON format containing:
            - "verdict": exactly one of "NORMAL_WEAR", "DAMAGE", or "DISPUTE_ESCALATE"
            - "damage_percent": integer from 0 to 100 indicating percentage of tenant deposit compensated to landlord
            - "reason": thorough, detailed reasoning explaining why this judgment was reached based on the rendered evidence and descriptions.
            """
            
            result_str = nondet.exec_prompt(prompt)
            cleaned_str = result_str.strip()
            if cleaned_str.startswith("```json"):
                cleaned_str = cleaned_str[7:]
            if cleaned_str.startswith("```"):
                cleaned_str = cleaned_str[3:]
            if cleaned_str.endswith("```"):
                cleaned_str = cleaned_str[:-3]
                
            return json.loads(cleaned_str.strip())
            
        def validator_fn(leader_result, my_result):
            # Quy tắc bắt buộc: Validator CHỈ so khớp verdict, bỏ qua hoàn toàn khác biệt câu chữ ở reason
            leader_verdict = leader_result.get("verdict")
            validator_verdict = my_result.get("verdict")
            return leader_verdict == validator_verdict
            
        # Dùng vm.run_nondet thực thi Intelligent Contract
        result = vm.run_nondet(leader_fn, validator_fn)
        
        verdict_str = str(result.get("verdict", "DISPUTE_ESCALATE"))
        reason_str = str(result.get("reason", "No reasoning generated."))
        damage_pct = int(result.get("damage_percent", 0))
        
        if damage_pct < 0:
            damage_pct = 0
        if damage_pct > 100:
            damage_pct = 100
            
        # Tính toán chia tiền (Cả 2 bên đều đã khóa deposit_amount)
        if verdict_str == "NORMAL_WEAR":
            # Tenant nhận lại trọn vẹn tiền đặt cọc, Landlord nhận lại phần khóa của mình
            escrow.landlord_payout = escrow.deposit_amount
            escrow.tenant_payout = escrow.deposit_amount
        elif verdict_str == "DAMAGE":
            # Landlord nhận phần bồi thường từ tiền đặt cọc của Tenant + tiền khóa của mình
            penalty = (escrow.deposit_amount * bigint(damage_pct)) // bigint(100)
            escrow.landlord_payout = escrow.deposit_amount + penalty
            escrow.tenant_payout = escrow.deposit_amount - penalty
        else:
            # DISPUTE_ESCALATE: Giữ tiền trong escrow, payout = 0 chờ xử lý escalation
            escrow.landlord_payout = bigint(0)
            escrow.tenant_payout = bigint(0)

        escrow.verdict = verdict_str
        escrow.reason = reason_str
        escrow.resolved = True
        self.escrows[escrow_id] = escrow
        
        return verdict_str

    def get_escrow(self, escrow_id: str) -> str:
        escrow = self.escrows.get(escrow_id)
        if escrow is None:
            raise Exception("Escrow not found")
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
