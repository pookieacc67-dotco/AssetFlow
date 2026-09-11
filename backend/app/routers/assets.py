from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import date
from app.models.schemas import AssetRegister, AssetAllocate, TransferRequestModel, CategoryCreate, DepartmentCreate
from app.db.connection import get_db, DBConnection
from app.services.business_rules import check_allocation_conflict, process_maintenance_transition
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/")
def list_assets(
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Returns inventory scoped to the user's organization with optional filters.
    """
    org_id = current_user["organization_id"]
    assets = db.query_all("assets", {"organization_id": org_id})
    
    # Apply filters programmatically
    filtered = []
    for a in assets:
        if category_id and a.get("category_id") != category_id:
            continue
        if status and a.get("status") != status:
            continue
        if location and location.lower() not in a.get("location", "").lower():
            continue
        if search:
            search_clean = search.lower()
            tag_match = search_clean in a.get("asset_tag", "").lower()
            name_match = search_clean in a.get("name", "").lower()
            serial_match = search_clean in (a.get("serial_number") or "").lower()
            if not (tag_match or name_match or serial_match):
                continue
        filtered.append(a)
    return filtered

@router.get("/{asset_id}")
def get_asset_detail(
    asset_id: str,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Retrieves detailed info about a specific asset, verifying organization scoping
    and assembling allocation history and maintenance records.
    """
    asset = db.query_one("assets", asset_id)
    if not asset or asset["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Assembling history
    allocations = db.query_all("allocations", {"asset_id": asset_id})
    # Resolve names for allocations
    for alloc in allocations:
        emp = db.query_one("users", alloc["employee_id"])
        alloc["employee_name"] = emp["name"] if emp else "Anonymous"

    transfers = db.query_all("transfers", {"asset_id": asset_id})
    maintenance = db.query_all("maintenance_requests", {"asset_id": asset_id})
    
    return {
        "asset": asset,
        "history": {
            "allocations": allocations,
            "transfers": transfers,
            "maintenance": maintenance
        }
    }

@router.post("/register")
def register_asset(
    payload: AssetRegister, 
    current_user: dict = Depends(get_current_user), 
    db: DBConnection = Depends(get_db)
):
    """
    Registers a new piece of hardware, scoped to current tenant.
    Enforces that only Admins and Asset Managers can register assets.
    """
    if current_user["role"] not in ("admin", "asset_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators and Asset Managers can register new assets."
        )
        
    org_id = current_user["organization_id"]
    
    # Check duplicate asset tag within the organization
    existing = db.query_first("assets", {"organization_id": org_id, "asset_tag": payload.asset_tag})
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Asset tag '{payload.asset_tag}' is already registered in your organization."
        )

    asset_id = db.generate_uuid()
    asset_record = {
        "id": asset_id,
        "organization_id": org_id,
        "asset_tag": payload.asset_tag,
        "name": payload.name,
        "category_id": payload.category_id,
        "serial_number": payload.serial_number,
        "acquisition_date": str(payload.acquisition_date),
        "acquisition_cost": payload.acquisition_cost,
        "condition": payload.condition,
        "location": payload.location,
        "is_bookable": 1 if payload.is_bookable else 0,
        "status": "Available",
        "photo_url": payload.photo_url
    }
    db.insert("assets", asset_record)
    
    # Log activity
    db.insert("activity_logs", {
        "id": db.generate_uuid(),
        "user_id": current_user["id"],
        "action": "asset_registered",
        "details": f"Registered new asset: {payload.name} ({payload.asset_tag})"
    })
    
    return {"success": True, "asset_id": asset_id, "status": "Available"}

@router.post("/{asset_id}/allocate")
def allocate_asset(
    asset_id: str, 
    payload: AssetAllocate, 
    current_user: dict = Depends(get_current_user), 
    db: DBConnection = Depends(get_db)
):
    """
    Allocates an available asset to a specific user.
    Enforces role checking (Asset Manager / Admin only).
    """
    if current_user["role"] not in ("admin", "asset_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Administrators and Asset Managers can allocate assets."
        )
        
    asset = db.query_one("assets", asset_id)
    if not asset or asset["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Asset not found")

    conflict = check_allocation_conflict(asset_id, db)
    if conflict:
        return conflict
        
    # Check target user belongs to same org
    target_user = db.query_one("users", payload.employee_id)
    if not target_user or target_user["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=400, detail="Target employee not found in your organization.")

    allocation_id = db.generate_uuid()
    db.insert("allocations", {
        "id": allocation_id,
        "asset_id": asset_id,
        "employee_id": payload.employee_id,
        "allocated_date": str(date.today()),
        "expected_return_date": str(payload.expected_return_date),
        "status": "Active"
    })
    
    # Update asset state
    db.update("assets", asset_id, {"status": "Allocated"})
    
    # Notify target user
    db.insert("notifications", {
        "id": db.generate_uuid(),
        "user_id": payload.employee_id,
        "type": "system",
        "message": f"Asset '{asset['name']}' has been allocated to you. Expected return date: {payload.expected_return_date}",
        "read": 0
    })

    return {"success": True, "allocation_id": allocation_id, "status": "Allocated"}

@router.post("/{asset_id}/transfer")
def request_transfer(
    asset_id: str, 
    payload: TransferRequestModel, 
    current_user: dict = Depends(get_current_user), 
    db: DBConnection = Depends(get_db)
):
    """
    Initiates a transfer request from the current holder/requester to a new employee.
    Enforced checking: anyone can request a transfer for an asset.
    """
    asset = db.query_one("assets", asset_id)
    if not asset or asset["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    # Resolve target user
    target_user = db.query_one("users", payload.to_user_id)
    if not target_user or target_user["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=400, detail="Target employee not found in organization.")

    # Find current holder of the asset
    active_alloc = db.query_first("allocations", {"asset_id": asset_id, "status": "Active"})
    from_user_id = active_alloc["employee_id"] if active_alloc else current_user["id"]

    transfer_id = db.generate_uuid()
    db.insert("transfers", {
        "id": transfer_id,
        "asset_id": asset_id,
        "from_user_id": from_user_id,
        "to_user_id": payload.to_user_id,
        "reason": payload.reason,
        "status": "Pending",
        "requested_by": current_user["id"]
    })
    
    # Notify department head or asset manager of the transfer
    managers = db.query_all("users", {"organization_id": current_user["organization_id"], "role": "asset_manager"})
    for mgr in managers:
        db.insert("notifications", {
            "id": db.generate_uuid(),
            "user_id": mgr["id"],
            "type": "approval",
            "message": f"Transfer requested for asset '{asset['name']}' to {target_user['name']}. Review required.",
            "read": 0
        })

    return {"success": True, "transfer_id": transfer_id, "status": "Pending"}

# --- Categories & Departments ---

@router.get("/categories/")
def list_categories(current_user: dict = Depends(get_current_user), db: DBConnection = Depends(get_db)):
    org_id = current_user["organization_id"]
    return db.query_all("asset_categories", {"organization_id": org_id})

@router.post("/categories/")
def create_category(payload: CategoryCreate, current_user: dict = Depends(get_current_user), db: DBConnection = Depends(get_db)):
    if current_user["role"] not in ("admin", "asset_manager"):
        raise HTTPException(status_code=403, detail="Permission denied")
    org_id = current_user["organization_id"]
    cat_id = f"{org_id}-{payload.name.lower().replace(' ', '-')}"
    db.insert("asset_categories", {
        "id": cat_id,
        "organization_id": org_id,
        "name": payload.name,
        "custom_fields": payload.custom_fields
    })
    return {"success": True, "category_id": cat_id}

@router.get("/departments/")
def list_departments(current_user: dict = Depends(get_current_user), db: DBConnection = Depends(get_db)):
    org_id = current_user["organization_id"]
    return db.query_all("departments", {"organization_id": org_id})

@router.post("/departments/")
def create_department(payload: DepartmentCreate, current_user: dict = Depends(get_current_user), db: DBConnection = Depends(get_db)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only Admins can manage departments")
    org_id = current_user["organization_id"]
    db.insert("departments", {
        "id": payload.id,
        "organization_id": org_id,
        "name": payload.name,
        "head_user_id": payload.head_user_id,
        "parent_department_id": payload.parent_department_id,
        "status": "Active"
    })
    return {"success": True, "department_id": payload.id}
