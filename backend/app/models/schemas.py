from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import date, datetime

# --- Auth Schemas ---

class OrgSignupComplete(BaseModel):
    organization_name: str = Field(..., min_length=2, max_length=255)
    industry: Optional[str] = None
    company_size: Optional[str] = None

class EmployeeSignupComplete(BaseModel):
    org_code: Optional[str] = None  # Explicit organization code or none if using domain matching

class OAuthCheck(BaseModel):
    firebase_token: str

class ResolveDomainRequest(BaseModel):
    email: EmailStr

class ResolveIdentifierRequest(BaseModel):
    identifier: str  # Accepted unified field: Email or Phone number

class UserRoleUpdate(BaseModel):
    role: str  # 'admin' | 'asset_manager' | 'dept_head' | 'employee'
    department_id: Optional[str] = None

class UserApprove(BaseModel):
    role: str = "employee"
    department_id: Optional[str] = None

class UserUpdateSelf(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    photo_url: Optional[str] = None

# --- Assets & Inventory Schemas ---

class AssetRegister(BaseModel):
    asset_tag: str
    name: str
    category_id: str
    serial_number: Optional[str] = None
    acquisition_date: date
    acquisition_cost: float
    condition: str = "New"
    location: str
    is_bookable: bool = False
    photo_url: Optional[str] = None

class AssetAllocate(BaseModel):
    employee_id: str
    expected_return_date: date

class TransferRequestModel(BaseModel):
    to_user_id: str
    reason: str

class CategoryCreate(BaseModel):
    name: str
    custom_fields: Optional[List[str]] = []

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    custom_fields: Optional[List[str]] = None

class DepartmentCreate(BaseModel):
    id: str
    name: str
    head_user_id: Optional[str] = None
    parent_department_id: Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    head_user_id: Optional[str] = None
    parent_department_id: Optional[str] = None
    status: Optional[str] = None

# --- Resource & Booking Schemas ---

class ResourceCreate(BaseModel):
    id: str
    name: str
    type: str  # 'Room' | 'Vehicle' | 'Equipment'
    location: str
    requires_approval: bool = False

class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    location: Optional[str] = None
    requires_approval: Optional[bool] = None

class BookingCreate(BaseModel):
    resource_id: str
    start_time: datetime
    end_time: datetime

# --- Maintenance Schemas ---

class MaintenanceCreate(BaseModel):
    asset_tag: str
    issue_description: str
    priority: str = "Medium"

class MaintenanceTransition(BaseModel):
    status: str
    technician_id: Optional[str] = None

# --- Audit Schemas ---

class AuditCreate(BaseModel):
    scope: str
    date_range_start: date
    date_range_end: date
    asset_tags: List[str]

class AuditItemVerify(BaseModel):
    verification_status: str  # 'verified' | 'missing' | 'damaged'
    notes: Optional[str] = None

# --- AI Agent Schemas ---

class AssetRecommendationRequest(BaseModel):
    prompt: str
    assets: List[Dict[str, Any]]

class SmartBookingRequest(BaseModel):
    prompt: str
    resources: List[Dict[str, Any]]
    currentTime: Optional[str] = None

class ReportGeneratorRequest(BaseModel):
    stats: Dict[str, Any]
