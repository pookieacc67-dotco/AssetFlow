from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.schemas import BookingCreate, ResourceCreate, ResourceUpdate
from app.db.connection import get_db, DBConnection
from app.services.business_rules import check_booking_overlap
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/")
def list_bookings(current_user: dict = Depends(get_current_user), db: DBConnection = Depends(get_db)):
    """
    Lists all bookings for resources belonging to the caller's organization.
    """
    org_id = current_user["organization_id"]
    resources = db.query_all("resources", {"organization_id": org_id})
    resource_ids = [r["id"] for r in resources]
    
    all_bookings = []
    for rid in resource_ids:
        bookings = db.query_all("bookings", {"resource_id": rid})
        for b in bookings:
            # Join user name
            user = db.query_one("users", b["booked_by"])
            b["booked_by_name"] = user["name"] if user else "Unknown User"
            # Join resource details
            res = next((r for r in resources if r["id"] == rid), None)
            b["resource_name"] = res["name"] if res else "Resource"
            all_bookings.append(b)
            
    return all_bookings

@router.post("/book")
def create_booking(
    payload: BookingCreate, 
    current_user: dict = Depends(get_current_user), 
    db: DBConnection = Depends(get_db)
):
    """
    Submits a booking request. Rejects immediately if slot overlap is found.
    Determines status (Upcoming vs Pending Approval) based on resource configuration.
    """
    # 1. Fetch resource and verify tenant scoping
    resource = db.query_one("resources", payload.resource_id)
    if not resource or resource["organization_id"] != current_user["organization_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested corporate resource is not registered in your organization."
        )

    # 2. Check for time slot overlap
    is_overlapping = check_booking_overlap(
        payload.resource_id, 
        payload.start_time, 
        payload.end_time, 
        db
    )
    if is_overlapping:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The requested time slot overlaps with an existing booking reservation."
        )
        
    # 3. Handle status based on resource rule
    requires_approval = resource.get("requires_approval") == 1 or resource.get("requires_approval") is True
    booking_status = "Pending Approval" if requires_approval else "Upcoming"

    booking_id = db.generate_uuid()
    booking_record = {
        "id": booking_id,
        "resource_id": payload.resource_id,
        "booked_by": current_user["id"],
        "start_time": payload.start_time.isoformat(),
        "end_time": payload.end_time.isoformat(),
        "status": booking_status
    }
    db.insert("bookings", booking_record)
    
    # 4. Notify managers if approval is needed
    if requires_approval:
        managers = db.query_all("users", {"organization_id": current_user["organization_id"], "role": "asset_manager"})
        for mgr in managers:
            db.insert("notifications", {
                "id": db.generate_uuid(),
                "user_id": mgr["id"],
                "type": "booking",
                "message": f"New booking request for '{resource['name']}' requires review.",
                "read": 0
            })
            
    # Log Activity
    db.insert("activity_logs", {
        "id": db.generate_uuid(),
        "user_id": current_user["id"],
        "action": "booking_created",
        "details": f"Reserved '{resource['name']}' from {payload.start_time} to {payload.end_time} (Status: {booking_status})"
    })

    return {"success": True, "booking_id": booking_id, "status": booking_status}

@router.patch("/{booking_id}/approve")
def approve_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Approves a pending booking request. Enforces roles: Asset Manager/Admin/Dept Head only.
    """
    if current_user["role"] not in ("admin", "asset_manager", "dept_head"):
        raise HTTPException(status_code=403, detail="Permission denied. Cannot approve bookings.")
        
    booking = db.query_one("bookings", booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found.")
        
    resource = db.query_one("resources", booking["resource_id"])
    if not resource or resource["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Booking resource not found.")
        
    db.update("bookings", booking_id, {"status": "Upcoming"})
    
    # Notify requester
    db.insert("notifications", {
        "id": db.generate_uuid(),
        "user_id": booking["booked_by"],
        "type": "booking",
        "message": f"Your booking reservation for '{resource['name']}' has been APPROVED.",
        "read": 0
    })
    
    return {"success": True, "status": "Upcoming"}

@router.patch("/{booking_id}/reject")
def reject_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Rejects a pending booking request. Enforces roles: Asset Manager/Admin/Dept Head only.
    """
    if current_user["role"] not in ("admin", "asset_manager", "dept_head"):
        raise HTTPException(status_code=403, detail="Permission denied. Cannot reject bookings.")
        
    booking = db.query_one("bookings", booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found.")
        
    resource = db.query_one("resources", booking["resource_id"])
    if not resource or resource["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Booking resource not found.")
        
    db.update("bookings", booking_id, {"status": "Cancelled"})
    
    # Notify requester
    db.insert("notifications", {
        "id": db.generate_uuid(),
        "user_id": booking["booked_by"],
        "type": "booking",
        "message": f"Your booking reservation for '{resource['name']}' has been REJECTED.",
        "read": 0
    })
    
    return {"success": True, "status": "Cancelled"}

# --- Resources Control ---

@router.get("/resources/")
def list_resources(current_user: dict = Depends(get_current_user), db: DBConnection = Depends(get_db)):
    org_id = current_user["organization_id"]
    return db.query_all("resources", {"organization_id": org_id})

@router.post("/resources/")
def create_resource(
    payload: ResourceCreate, 
    current_user: dict = Depends(get_current_user), 
    db: DBConnection = Depends(get_db)
):
    if current_user["role"] not in ("admin", "asset_manager"):
        raise HTTPException(status_code=403, detail="Permission denied")
    org_id = current_user["organization_id"]
    db.insert("resources", {
        "id": payload.id,
        "organization_id": org_id,
        "name": payload.name,
        "type": payload.type,
        "location": payload.location,
        "is_bookable": 1,
        "requires_approval": 1 if payload.requires_approval else 0
    })
    return {"success": True, "resource_id": payload.id}

@router.patch("/resources/{resource_id}")
def update_resource(
    resource_id: str, 
    payload: ResourceUpdate,
    current_user: dict = Depends(get_current_user), 
    db: DBConnection = Depends(get_db)
):
    if current_user["role"] not in ("admin", "asset_manager"):
        raise HTTPException(status_code=403, detail="Permission denied")
    resource = db.query_one("resources", resource_id)
    if not resource or resource["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    update_data = {}
    if payload.name is not None:
        update_data["name"] = payload.name
    if payload.type is not None:
        update_data["type"] = payload.type
    if payload.location is not None:
        update_data["location"] = payload.location
    if payload.requires_approval is not None:
        update_data["requires_approval"] = 1 if payload.requires_approval else 0
        
    db.update("resources", resource_id, update_data)
    return {"success": True}
