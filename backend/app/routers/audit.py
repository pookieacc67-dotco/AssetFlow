from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from app.models.schemas import AuditCreate, AuditItemVerify
from app.db.connection import get_db, DBConnection
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/")
def list_audits(current_user: dict = Depends(get_current_user), db: DBConnection = Depends(get_db)):
    """
    Lists all audits scoped to the caller's organization.
    """
    org_id = current_user["organization_id"]
    return db.query_all("audits", {"organization_id": org_id})

@router.get("/{audit_id}")
def get_audit_detail(
    audit_id: str,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Returns audit details with verified/unverified items.
    """
    audit = db.query_one("audits", audit_id)
    if not audit or audit["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Audit cycle not found.")
        
    items = db.query_all("audit_items", {"audit_id": audit_id})
    for item in items:
        # Join asset info
        asset = db.query_one("assets", item["asset_id"])
        if asset:
            item["asset_name"] = asset["name"]
            item["asset_tag"] = asset["asset_tag"]
            
    return {"audit": audit, "items": items}

@router.post("/start")
def start_audit(
    payload: AuditCreate,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Starts a new audit cycle and populates its verify item checklist.
    Admin or Asset Manager only.
    """
    if current_user["role"] not in ("admin", "asset_manager"):
        raise HTTPException(status_code=403, detail="Permission denied. Cannot start audits.")
        
    org_id = current_user["organization_id"]
    
    audit_id = db.generate_uuid()
    db.insert("audits", {
        "id": audit_id,
        "organization_id": org_id,
        "scope": payload.scope,
        "date_range_start": str(payload.date_range_start),
        "date_range_end": str(payload.date_range_end),
        "status": "Active"
    })
    
    # Populate checklist items
    items_created = 0
    for tag in payload.asset_tags:
        asset = db.query_first("assets", {"organization_id": org_id, "asset_tag": tag})
        if asset:
            db.insert("audit_items", {
                "id": db.generate_uuid(),
                "audit_id": audit_id,
                "asset_id": asset["id"],
                "verification_status": "verified",
                "notes": ""
            })
            items_created += 1
            
    # Log Activity
    db.insert("activity_logs", {
        "id": db.generate_uuid(),
        "user_id": current_user["id"],
        "action": "audit_started",
        "details": f"Started audit '{payload.scope}' with {items_created} checklist items"
    })

    return {"success": True, "audit_id": audit_id, "items_count": items_created}

@router.patch("/{audit_id}/items/{asset_id}")
def verify_audit_item(
    audit_id: str,
    asset_id: str,
    payload: AuditItemVerify,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Verifies verification status of an asset during the active audit.
    """
    audit = db.query_one("audits", audit_id)
    if not audit or audit["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Audit cycle not found.")
        
    if audit["status"] != "Active":
        raise HTTPException(status_code=400, detail="Cannot edit a closed audit cycle.")
        
    # Get audit checklist item
    item = db.query_first("audit_items", {"audit_id": audit_id, "asset_id": asset_id})
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found for this audit.")
        
    db.update("audit_items", item["id"], {
        "verification_status": payload.verification_status,
        "notes": payload.notes or ""
    })
    
    # Log Compliance log
    db.insert("audit_logs", {
        "id": db.generate_uuid(),
        "user_id": current_user["id"],
        "action": "item_verified",
        "entity_type": "audit_item",
        "entity_id": item["id"]
    })

    return {"success": True}

@router.post("/{audit_id}/close")
def close_audit(
    audit_id: str,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Closes the audit cycle, locking it. Updates status of lost and damaged assets,
    automatically routing damaged items into maintenance workflows.
    """
    if current_user["role"] not in ("admin", "asset_manager"):
        raise HTTPException(status_code=403, detail="Permission denied. Cannot close audits.")
        
    audit = db.query_one("audits", audit_id)
    if not audit or audit["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Audit cycle not found.")
        
    if audit["status"] != "Active":
        return {"success": True, "message": "Audit already completed."}
        
    db.update("audits", audit_id, {"status": "Completed"})
    
    items = db.query_all("audit_items", {"audit_id": audit_id})
    lost_count = 0
    damaged_count = 0
    
    for item in items:
        status = item["verification_status"]
        asset_id = item["asset_id"]
        
        if status == "missing":
            db.update("assets", asset_id, {"status": "Lost"})
            lost_count += 1
        elif status == "damaged":
            # Update asset status
            db.update("assets", asset_id, {"status": "Damaged"})
            damaged_count += 1
            
            # Route to maintenance
            db.insert("maintenance_requests", {
                "id": db.generate_uuid(),
                "asset_id": asset_id,
                "raised_by": current_user["id"],
                "issue_description": f"Damaged item reported during audit '{audit['scope']}': {item['notes']}",
                "priority": "High",
                "status": "Pending",
                "technician_id": None,
                "attachments": []
            })
            
    # Log Activity
    db.insert("activity_logs", {
        "id": db.generate_uuid(),
        "user_id": current_user["id"],
        "action": "audit_closed",
        "details": f"Closed audit '{audit['scope']}'. Resulted in {lost_count} lost assets and {damaged_count} routed to repair."
    })

    return {
        "success": True, 
        "status": "Completed", 
        "lost_flagged": lost_count, 
        "maintenance_routed": damaged_count
    }
