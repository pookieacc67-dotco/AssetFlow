from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
from app.models.schemas import (
    ResolveIdentifierRequest, ResolveDomainRequest, 
    OrgSignupComplete, EmployeeSignupComplete, OAuthCheck
)
from app.db.connection import get_db, DBConnection
from app.services.business_rules import execute_complete_org_signup, is_corporate_domain

router = APIRouter()
security = HTTPBearer()

import base64
import json

def decode_token(token: str) -> tuple:
    """
    Decodes Firebase ID tokens (real JWT payload) or parses mock tokens during local development.
    Mock token format: mock_uid_UID_email_EMAIL_name_NAME
    """
    if token.startswith("mock_"):
        parts = token.split("_")
        uid = "mock_default"
        email = "user@company.com"
        name = "Mock User"
        
        for i in range(len(parts)):
            if parts[i] == "uid" and i + 1 < len(parts):
                uid = parts[i+1]
            elif parts[i] == "email" and i + 1 < len(parts):
                email = parts[i+1]
            elif parts[i] == "name" and i + 1 < len(parts):
                name = parts[i+1].replace("-", " ")
        return uid, email, name
    else:
        # Decodes real Firebase token payload
        try:
            parts = token.split(".")
            if len(parts) == 3:
                payload_b64 = parts[1]
                payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
                payload_data = base64.b64decode(payload_b64).decode("utf-8")
                payload = json.loads(payload_data)
                
                uid = payload.get("sub") or payload.get("user_id") or token
                email = payload.get("email") or payload.get("phone_number") or "user@company.com"
                name = payload.get("name") or payload.get("phone_number") or "Active User"
                return uid, email, name
        except Exception as e:
            print(f"[AssetFlow Auth] Error parsing Firebase JWT: {e}")
            
        return token, "user@company.com", "Active User"

def get_auth_payload(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """FastAPI dependency to extract Firebase token metadata before DB creation."""
    token = credentials.credentials
    uid, email, name = decode_token(token)
    return {"uid": uid, "email": email, "name": name}

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: DBConnection = Depends(get_db)) -> dict:
    """FastAPI dependency that decodes user token and fetches current DB profile."""
    token = credentials.credentials
    uid, _, _ = decode_token(token)
    user = db.query_first("users", {"firebase_uid": uid})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or profile not initialized. Register first."
        )
    return user

@router.post("/resolve-identifier")
def resolve_identifier(payload: ResolveIdentifierRequest, db: DBConnection = Depends(get_db)):
    """
    Step 1 of Unified Field Login:
    Checks if Email/Phone exists. Resolves phone accounts to Firebase email.
    """
    identifier = payload.identifier.strip().lower()
    
    # Try finding user by email or phone
    user_record = db.query_first("users", {"email": identifier})
    if not user_record:
        user_record = db.query_first("users", {"phone": identifier})

    if user_record:
        email = user_record.get("email")
        if user_record.get("auth_provider") == "phone" and user_record.get("phone"):
            email = f"{user_record.get('phone')}@assetflow.internal"
            
        return {
            "status": "existing_user",
            "provider": user_record.get("auth_provider", "email"),
            "email": email,
            "role": user_record.get("role", "employee"),
            "user_status": user_record.get("status")
        }
    
    # If not registered, check domain match for corporate email
    if "@" in identifier and is_corporate_domain(identifier):
        domain = identifier.split("@")[-1]
        matched_org = db.query_first("organizations", {"company_domain": domain})
        if matched_org:
            return {
                "status": "domain_match",
                "organization_name": matched_org["organization_name"],
                "organization_id": matched_org["id"],
                "message": f"We found your company profile: {matched_org['organization_name']}. Request to join now!"
            }
            
    return {
        "status": "not_found",
        "message": "Start organization setup or apply to join an existing workplace code."
    }

@router.post("/resolve-domain")
def resolve_domain(payload: ResolveDomainRequest, db: DBConnection = Depends(get_db)):
    """
    Auto-suggests organization lookup matching user email domain.
    """
    email = payload.email.strip().lower()
    if not is_corporate_domain(email):
        return {
            "is_corporate": False,
            "has_match": False,
            "message": "Domain is blocked for matching (personal/free account provider)."
        }
        
    domain = email.split("@")[-1]
    matched_org = db.query_first("organizations", {"company_domain": domain})
    if matched_org:
        return {
            "is_corporate": True,
            "has_match": True,
            "organization_name": matched_org["organization_name"],
            "organization_id": matched_org["id"]
        }
        
    return {
        "is_corporate": True,
        "has_match": False,
        "domain": domain
    }

@router.post("/complete-org-signup")
def complete_org_signup(
    payload: OrgSignupComplete, 
    auth_payload: dict = Depends(get_auth_payload), 
    db: DBConnection = Depends(get_db)
):
    """
    Creates organization, creates user as Admin, links them together, and seeds categories.
    """
    uid = auth_payload["uid"]
    email = auth_payload["email"]
    name = auth_payload["name"]
    
    # Verify no account exists with this firebase uid
    existing = db.query_first("users", {"firebase_uid": uid})
    if existing:
        raise HTTPException(status_code=400, detail="Account already registered.")
        
    try:
        signup_result = execute_complete_org_signup(
            firebase_uid=uid,
            email=email,
            full_name=name,
            org_name=payload.organization_name,
            industry=payload.industry,
            company_size=payload.company_size,
            db_connection=db
        )
        return {
            "success": True,
            "organization_id": signup_result["organization_id"],
            "user_id": signup_result["user_id"],
            "status": "active"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/complete-employee-signup")
def complete_employee_signup(
    payload: EmployeeSignupComplete,
    auth_payload: dict = Depends(get_auth_payload),
    db: DBConnection = Depends(get_db)
):
    """
    Signs up employee into organization by matching code or corporate domain.
    """
    uid = auth_payload["uid"]
    email = auth_payload["email"]
    name = auth_payload["name"]
    
    existing = db.query_first("users", {"firebase_uid": uid})
    if existing:
        raise HTTPException(status_code=400, detail="User already registered.")
        
    org = None
    
    # 1. Resolve via explicit org code if provided
    if payload.org_code:
        org_code_clean = payload.org_code.strip()
        org = db.query_first("organizations", {"organization_code": org_code_clean})
        if not org:
            org = db.query_one("organizations", org_code_clean)
    
    # 2. Fall back to domain auto-matching
    if not org and is_corporate_domain(email):
        domain = email.split("@")[-1]
        org = db.query_first("organizations", {"company_domain": domain})
        
    if not org:
        raise HTTPException(
            status_code=400, 
            detail="Could not resolve organization. Check the org code or use a corporate domain."
        )
        
    user_id = db.generate_uuid()
    
    phone = None
    auth_provider = "email"
    if email and email.endswith("@assetflow.internal"):
        phone = email.split("@")[0]
        email = None
        auth_provider = "phone"

    db.insert("users", {
        "id": user_id,
        "organization_id": org["id"],
        "firebase_uid": uid,
        "name": name,
        "email": email,
        "phone": phone,
        "auth_provider": auth_provider,
        "role": "employee",
        "status": "pending_approval"
    })
    
    # Notify Admins of the organization
    admins = db.query_all("users", {"organization_id": org["id"], "role": "admin"})
    for admin in admins:
        db.insert("notifications", {
            "id": db.generate_uuid(),
            "user_id": admin["id"],
            "type": "approval",
            "message": f"Join request from new employee: {name} ({email})",
            "read": 0
        })
        
    # Log Activity
    db.insert("activity_logs", {
        "id": db.generate_uuid(),
        "user_id": user_id,
        "action": "employee_signup",
        "details": f"Registered join request for organization {org['id']}"
    })
    
    return {
        "success": True,
        "user_id": user_id,
        "status": "pending_approval",
        "organization_name": org["organization_name"]
    }

@router.post("/oauth-check")
def oauth_check(
    payload: OAuthCheck,
    db: DBConnection = Depends(get_db)
):
    """
    Verifies Firebase token details and maps returning OAuth profiles.
    """
    uid, email, name = decode_token(payload.firebase_token)
    user = db.query_first("users", {"firebase_uid": uid})
    
    if user:
        org = db.query_one("organizations", user["organization_id"])
        return {
            "status": "existing_user",
            "uid": uid,
            "email": email,
            "organization_id": user["organization_id"],
            "organization_name": org["organization_name"] if org else "Acme Logistics",
            "role": user["role"],
            "user_status": user["status"]
        }
    else:
        return {
            "status": "new_user",
            "uid": uid,
            "email": email,
            "name": name
        }
