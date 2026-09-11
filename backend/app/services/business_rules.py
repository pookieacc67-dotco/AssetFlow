from datetime import datetime, date
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

# 1. Domain-Matching Safety Denylist
FREE_EMAIL_PROVIDERS = {
    "gmail.com", "outlook.com", "yahoo.com", "icloud.com", "hotmail.com", 
    "live.com", "msn.com", "aol.com", "mail.com", "yandex.com", "protonmail.com"
}

def is_corporate_domain(email: str) -> bool:
    """
    Validates that a company domain does not belong to a free public provider
    to prevent rogue tenants from absorbing generic email address pools.
    """
    if "@" not in email:
        return False
    domain = email.split("@")[-1].strip().lower()
    return domain not in FREE_EMAIL_PROVIDERS

# 2. Seeding Starter Categories
STARTER_CATEGORIES = [
    {"id": "cat-1", "name": "Electronics", "custom_fields": ["Processor", "RAM", "Storage"]},
    {"id": "cat-2", "name": "Furniture", "custom_fields": ["Material", "Dimensions"]},
    {"id": "cat-3", "name": "Vehicles", "custom_fields": ["License Plate", "Fuel Type"]},
    {"id": "cat-4", "name": "IT Equipment", "custom_fields": ["Brand", "OS"]},
    {"id": "cat-5", "name": "Office Supplies", "custom_fields": []}
]

def seed_starter_categories(org_id: str, db_connection: Any):
    """
    Seeds standard categories automatically on organization creation.
    """
    for category in STARTER_CATEGORIES:
        db_connection.insert("asset_categories", {
            "id": f"{org_id}-{category['id']}",
            "organization_id": org_id,
            "name": category["name"],
            "custom_fields": category["custom_fields"]
        })

# 3. Circular-Reference Org Setup Transaction
def execute_complete_org_signup(
    firebase_uid: str,
    email: str,
    full_name: str,
    org_name: str,
    industry: Optional[str],
    company_size: Optional[str],
    db_connection: Any
) -> Dict[str, Any]:
    """
    Circular Reference Safe Transaction:
    1. Inserts Organization with 'created_by' left NULL.
    2. Inserts User with the new 'organization_id'.
    3. Updates Organization 'created_by' to point to the newly created User ID.
    4. Seeds the starter asset categories.
    """
    # Create random secure ORG code
    import random, string
    random_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    org_id = f"ORG_{random_code}"
    
    # Deriving corporate domain
    domain = email.split("@")[-1] if is_corporate_domain(email) else None

    # Step 1: Insert organization (with created_by NULL)
    org_data = {
        "id": org_id,
        "organization_name": org_name,
        "organization_code": org_id,
        "company_email": email,
        "company_domain": domain,
        "industry": industry,
        "company_size": company_size,
        "created_by": None,
        "subscription_plan": "free",
        "status": "active"
    }
    db_connection.insert("organizations", org_data)

    # Step 2: Insert Admin user row
    user_id = db_connection.generate_uuid()
    
    phone = None
    auth_provider = "email"
    if email and email.endswith("@assetflow.internal"):
        phone = email.split("@")[0]
        email = None
        auth_provider = "phone"

    user_data = {
        "id": user_id,
        "organization_id": org_id,
        "firebase_uid": firebase_uid,
        "name": full_name,
        "email": email,
        "phone": phone,
        "auth_provider": auth_provider,
        "role": "admin",
        "status": "active"
    }
    db_connection.insert("users", user_data)

    # Step 3: Complete circular reference
    db_connection.update("organizations", org_id, {"created_by": user_id})

    # Step 4: Seed starter asset categories
    seed_starter_categories(org_id, db_connection)

    return {"organization_id": org_id, "user_id": str(user_id)}

# 4. Allocation Conflict Verification
def check_allocation_conflict(asset_id: str, db_connection: Any) -> Optional[Dict[str, Any]]:
    """
    Checks if an asset is already allocated. Surfaced holders and transfer option.
    """
    asset = db_connection.query_one("assets", asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    if asset["status"] != "Available":
        # Pull active allocation
        active_alloc = db_connection.query_first(
            "allocations", 
            {"asset_id": asset_id, "status": "Active"}
        )
        if active_alloc:
            holder = db_connection.query_one("users", active_alloc["employee_id"])
            return {
                "available": False,
                "current_holder": holder["name"] if holder else "Anonymous User",
                "allocation_id": str(active_alloc["id"]),
                "message": "Asset is currently allocated. You can file a transfer request instead."
            }
    return None

def parse_dt(dt_val: Any) -> datetime:
    """Robust helper to parse datetime objects or ISO strings from SQLite."""
    if isinstance(dt_val, datetime):
        return dt_val
    if isinstance(dt_val, str):
        val = dt_val.replace("Z", "")
        if "+" in val:
            val = val.split("+")[0]
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
    raise ValueError(f"Unable to parse datetime: {dt_val}")

# 5. Booking Overlap Check
def check_booking_overlap(
    resource_id: str, 
    start_time: datetime, 
    end_time: datetime, 
    db_connection: Any
) -> bool:
    """
    Rejects any booked time slots that overlap existing bookings on the same resource,
    while permitting adjacent back-to-back reservations.
    """
    existing_bookings = db_connection.query_all(
        "bookings", 
        {"resource_id": resource_id, "status_not_in": ["Cancelled", "Rejected"]}
    )
    for b in existing_bookings:
        b_start = parse_dt(b["start_time"])
        b_end = parse_dt(b["end_time"])
        # Overlap conditional: (StartA < EndB) AND (EndA > StartB)
        if start_time < b_end and end_time > b_start:
            return True
    return False

# 6. Maintenance Workflow Status Sync
def process_maintenance_transition(
    ticket_id: str,
    new_status: str,
    db_connection: Any
):
    """
    Flips asset's status to 'Under Maintenance' on In Progress/Approved and back to 'Available' on resolution.
    """
    ticket = db_connection.query_one("maintenance_requests", ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found")
        
    db_connection.update("maintenance_requests", ticket_id, {"status": new_status})
    
    if new_status in ("In Progress", "Approved"):
        db_connection.update("assets", ticket["asset_id"], {"status": "Under Maintenance"})
    elif new_status == "Resolved":
        db_connection.update("assets", ticket["asset_id"], {"status": "Available"})
