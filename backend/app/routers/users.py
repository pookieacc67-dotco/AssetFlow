from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from app.models.schemas import UserRoleUpdate, UserApprove, UserUpdateSelf
from app.db.connection import get_db, DBConnection
from app.routers.auth import get_current_user

router = APIRouter()

@router.get("/me")
def get_user_me(current_user: dict = Depends(get_current_user)):
    """
    Returns the currently authenticated user profile.
    """
    return current_user

@router.patch("/me")
def update_user_me(
    payload: UserUpdateSelf,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Updates the caller's name and avatar only.
    """
    update_data = {
        "name": payload.name
    }
    if payload.photo_url is not None:
        update_data["photo_url"] = payload.photo_url
        
    db.update("users", current_user["id"], update_data)
    return {"success": True, "updated": update_data}

@router.get("/")
def list_users(current_user: dict = Depends(get_current_user), db: DBConnection = Depends(get_db)):
    """
    Lists users in the organization (only active users unless caller is Admin).
    """
    org_id = current_user["organization_id"]
    all_users = db.query_all("users", {"organization_id": org_id})
    
    if current_user["role"] == "admin":
        return all_users
        
    # Non-admins only see active users
    return [u for u in all_users if u["status"] == "active"]

@router.patch("/{user_id}/approve")
def approve_user(
    user_id: str,
    payload: UserApprove,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Approves a pending employee's join request. Admin-only.
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only Administrators can approve join requests.")
        
    target_user = db.query_one("users", user_id)
    if not target_user or target_user["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Employee profile not found.")
        
    update_data = {
        "status": "active",
        "role": payload.role
    }
    if payload.department_id:
        update_data["department_id"] = payload.department_id
        
    db.update("users", user_id, update_data)
    
    # Notify employee
    db.insert("notifications", {
        "id": db.generate_uuid(),
        "user_id": user_id,
        "type": "system",
        "message": f"Your join request has been approved! You have been assigned the '{payload.role}' role.",
        "read": 0
    })
    
    # Log Activity
    db.insert("activity_logs", {
        "id": db.generate_uuid(),
        "user_id": current_user["id"],
        "action": "user_approved",
        "details": f"Approved join request for {target_user['name']} as {payload.role}"
    })
    
    return {"success": True, "status": "active"}

@router.patch("/{user_id}/reject")
def reject_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Rejects a pending employee's join request. Admin-only.
    Flips status to 'inactive' for audit trail.
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only Administrators can reject join requests.")
        
    target_user = db.query_one("users", user_id)
    if not target_user or target_user["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="Employee profile not found.")
        
    db.update("users", user_id, {"status": "inactive"})
    
    # Log Activity
    db.insert("activity_logs", {
        "id": db.generate_uuid(),
        "user_id": current_user["id"],
        "action": "user_rejected",
        "details": f"Rejected join request for {target_user['name']}"
    })
    
    return {"success": True, "status": "inactive"}

@router.patch("/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_user: dict = Depends(get_current_user),
    db: DBConnection = Depends(get_db)
):
    """
    Updates the role/department of a user. Admin-only.
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only Administrators can modify user roles.")
        
    target_user = db.query_one("users", user_id)
    if not target_user or target_user["organization_id"] != current_user["organization_id"]:
        raise HTTPException(status_code=404, detail="User profile not found.")
        
    update_data = {
        "role": payload.role
    }
    if payload.department_id is not None:
        update_data["department_id"] = payload.department_id
        
    db.update("users", user_id, update_data)
    
    # Notify user of role promotion
    db.insert("notifications", {
        "id": db.generate_uuid(),
        "user_id": user_id,
        "type": "system",
        "message": f"Your organization role has been updated to '{payload.role}'.",
        "read": 0
    })
    
    # Log Activity
    db.insert("activity_logs", {
        "id": db.generate_uuid(),
        "user_id": current_user["id"],
        "action": "user_role_updated",
        "details": f"Promoted user {target_user['name']} to '{payload.role}'"
    })
    
    return {"success": True, "role": payload.role}
