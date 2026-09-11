-- ============================================================================
-- AssetFlow DB Schema — 16 Tables (Supabase PostgreSQL / Row Level Security ready)
-- Order of Execution matches BACKEND.md exactly to preserve foreign-key resolution
-- ============================================================================

BEGIN;

-- 1. Organizations table (Circular ref handled with created_by being nullable first)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(12) PRIMARY KEY, -- Formatted uniquely like 'ORG_XXXXXX'
    organization_name VARCHAR(255) NOT NULL,
    organization_code VARCHAR(50) UNIQUE NOT NULL,
    company_email VARCHAR(255) NOT NULL,
    company_domain VARCHAR(255), -- Derived server-side, null for phone signup path
    logo VARCHAR(512),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    address TEXT,
    created_by UUID, -- FK to users.id, set to NULL initially during circular creation
    subscription_plan VARCHAR(50) DEFAULT 'free' NOT NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Users table (Scoped by organization_id, binds to Firebase Auth uid)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(12) NOT NULL REFERENCES organizations(id),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    auth_provider VARCHAR(50) NOT NULL, -- 'email' | 'phone' | 'google' | 'github'
    role VARCHAR(50) DEFAULT 'employee' NOT NULL, -- 'admin' | 'asset_manager' | 'dept_head' | 'employee'
    department_id VARCHAR(50), -- REFERENCES departments(id) added after departments is created
    status VARCHAR(50) DEFAULT 'pending_verification' NOT NULL, -- 'pending_verification' | 'pending_approval' | 'active' | 'inactive'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Complete circular foreign key for Organizations
ALTER TABLE organizations ADD CONSTRAINT fk_org_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Departments table (Multi-tenant scoped, head references users)
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(12) NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    head_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_department_id VARCHAR(50) REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Active' NOT NULL
);

-- Link users back to departments now that departments table exists
ALTER TABLE users ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- 4. Asset Categories table
CREATE TABLE IF NOT EXISTS asset_categories (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(12) NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    custom_fields JSONB DEFAULT '[]'::jsonb NOT NULL -- e.g. ["Processor", "RAM", "Storage"]
);

-- 5. Assets table (Core inventory scoped by org, includes local unique asset_tag)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(12) NOT NULL REFERENCES organizations(id),
    asset_tag VARCHAR(50) NOT NULL, -- Local unique tag, e.g. 'AF-0001' (Unique per organization)
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) REFERENCES asset_categories(id) ON DELETE SET NULL,
    serial_number VARCHAR(255),
    acquisition_date DATE NOT NULL,
    acquisition_cost NUMERIC(12, 2) NOT NULL,
    condition VARCHAR(50) DEFAULT 'New' NOT NULL, -- 'New' | 'Good' | 'Fair' | 'Poor' | 'Damaged'
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available' NOT NULL, -- 'Available' | 'Allocated' | 'Under Maintenance' | 'Lost' | 'Damaged'
    is_bookable BOOLEAN DEFAULT FALSE NOT NULL,
    photo_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT unique_asset_tag_per_org UNIQUE (organization_id, asset_tag)
);

-- 6. Allocations table (Tracks direct handovers)
CREATE TABLE IF NOT EXISTS allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department_id VARCHAR(50) REFERENCES departments(id) ON DELETE CASCADE,
    allocated_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return_date DATE,
    status VARCHAR(50) DEFAULT 'Active' NOT NULL -- 'Active' | 'Returned' | 'Overdue'
);

-- 7. Transfers table (Awaiting Dept Head / Admin reviews)
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending' NOT NULL, -- 'Pending' | 'Approved' | 'Rejected'
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Returns table
CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES allocations(id) ON DELETE CASCADE,
    returned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    condition_notes TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Shareable Resources table
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(12) NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Room' | 'Vehicle' | 'Equipment'
    location VARCHAR(255) NOT NULL,
    is_bookable BOOLEAN DEFAULT TRUE NOT NULL,
    requires_approval BOOLEAN DEFAULT FALSE NOT NULL
);

-- 10. Bookings table (With overlap prevention validation in service)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id VARCHAR(50) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    booked_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending Approval' NOT NULL, -- 'Pending Approval' | 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 11. Maintenance Requests table (Affects asset status on approval)
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    issue_description TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'Medium' NOT NULL, -- 'Low' | 'Medium' | 'High' | 'Emergency'
    status VARCHAR(50) DEFAULT 'Pending' NOT NULL, -- 'Pending' | 'In Progress' | 'Resolved' | 'Cancelled'
    technician_id VARCHAR(100),
    attachments JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 12. Audits table (Scheduled cycles)
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(12) NOT NULL REFERENCES organizations(id),
    scope VARCHAR(255) NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active' NOT NULL -- 'Active' | 'Completed' | 'Draft'
);

-- 13. Audit Items table (Individual inventory verification checks)
CREATE TABLE IF NOT EXISTS audit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    verification_status VARCHAR(50) DEFAULT 'verified' NOT NULL, -- 'verified' | 'missing' | 'damaged'
    notes TEXT
);

-- 14. Audit Logs (Compliance events)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 15. System Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'alert' | 'approval' | 'booking' | 'system'
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 16. Activity Logs table (General operational logging)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMIT;
