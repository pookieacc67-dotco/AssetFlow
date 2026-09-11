from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from app.models.schemas import MaintenanceCreate, MaintenanceTransition
from app.db.connection import get_db, DBConnection
from app.services.business_rules import process_maintenance_transition
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/")
def list_tickets(current_user: dict = Depends(get_current_user), db: DBConnection = Depends(get_db)):
    """
    Lists all maintenance tickets scoped to the caller's organization.
    """
    org_id = current_user["organization_id"]
    assets = db.query_all("assets", {"organization_id": org_id})
    asset_ids = {a["id"] for a in assets}
    asset_map = {a["id"]: a for a in assets}
    
    all_tickets = db.query_all("maintenance_requests", {})
    filtered = []
    for t in all_tickets:
        if t["asset_id"] in asset_ids:
            # Join asset name and tag
            asset = asset_map[t["asset_id"]]
            t["asset_name"] = asset["name"]
            t["asset_tag"] = asset["asset_tag"]
            # Join user name
            user = db.query_one("users", t["raised_by"])
            t["raised_by_name"] = user["name"] if user else "Anonymous"
            filtered.append(t)
            
    return filtered

@router.post("/raise")
def raise_ticket(
    payload: MaintenanceCreate,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Creates a new maintenance ticket. Sets status to 'Pending'.
    """
    org_id = current_user["organization_id"]
    
    # 1. Resolve asset by tag
    asset = db.query_first("assets", {"organization_id": org_id, "asset_tag": payload.asset_tag})
    if not asset:
        raise HTTPException(
            status_code=404, 
            detail=f"Asset with tag '{payload.asset_tag}' not found in your organization."
        )
        
    ticket_id = db.generate_uuid()
    ticket_record = {
        "id": ticket_id,
        "asset_id": asset["id"],
        "raised_by": current_user["id"],
        "issue_description": payload.issue_description,
        "priority": payload.priority,
        "status": "Pending",
        "technician_id": None,
        "attachments": []
    }
    db.insert("maintenance_requests", ticket_record)
    
    # Notify Asset Managers
    managers = db.query_all("users", {"organization_id": org_id, "role": "asset_manager"})
    for mgr in managers:
        db.insert("notifications", {
            "id": db.generate_uuid(),
            "user_id": mgr["id"],
            "type": "alert",
            "message": f"Maintenance ticket raised for '{asset['name']}' ({payload.priority} priority)",
            "read": 0
        })

    return {"success": True, "ticket_id": ticket_id, "status": "Pending"}

@router.patch("/{ticket_id}/transition")
def transition_ticket(
    ticket_id: str,
    payload: MaintenanceTransition,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Assigns technician and updates status. Triggers underlying asset status updates.
    Enforces Asset Manager or Admin roles.
    """
    if current_user["role"] not in ("admin", "asset_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators and Asset Managers can update maintenance cycles."
        )
        
    ticket = db.query_one("maintenance_requests", ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found.")
        
    asset = db.query_one("assets", ticket["asset_id"])
    if not asset or asset["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Asset associated with this ticket not found.")

    update_fields = {}
    if payload.technician_id is not None:
        update_fields["technician_id"] = payload.technician_id
        
    db.update("maintenance_requests", ticket_id, update_fields)
    
    # Process transition logic (updates asset status if needed)
    try:
        process_maintenance_transition(ticket_id, payload.status, db)
        
        # Notify requester
        db.insert("notifications", {
            "id": db.generate_uuid(),
            "user_id": ticket["raised_by"],
            "type": "system",
            "message": f"Your maintenance ticket for '{asset['name']}' is now: {payload.status}.",
            "read": 0
        })
        
        # Log activity
        db.insert("activity_logs", {
            "id": db.generate_uuid(),
            "user_id": current_user["id"],
            "action": "maintenance_transition",
            "details": f"Transitioned ticket {ticket_id} to '{payload.status}'"
        })
        
        return {"success": True, "status": payload.status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
