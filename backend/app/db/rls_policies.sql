-- ============================================================================
-- Row Level Security (RLS) policies for multi-tenant isolation
-- Binds Supabase trusted Firebase Auth tokens to the tenant database
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Tenant identification helper function
-- Resolves the caller's organization by looking up their Firebase Auth ID
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS VARCHAR(12) AS $$
DECLARE
    org_id VARCHAR(12);
BEGIN
    -- Look up the user's registered organization based on Supabase's authenticated auth.uid() matching our users.firebase_uid
    SELECT organization_id INTO org_id
    FROM users
    WHERE firebase_uid = auth.uid()::text;
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 1. Organizations Policies
-- ----------------------------------------------------------------------------
CREATE POLICY select_org ON organizations
    FOR SELECT
    USING (id = current_org_id());

CREATE POLICY update_org ON organizations
    FOR UPDATE
    USING (id = current_org_id() AND EXISTS (
        SELECT 1 FROM users 
        WHERE users.firebase_uid = auth.uid()::text AND users.role = 'admin'
    ));

-- ----------------------------------------------------------------------------
-- 2. Users Policies
-- ----------------------------------------------------------------------------
-- Allow users to read colleagues in their own organization, and their own row
CREATE POLICY select_users ON users
    FOR SELECT
    USING (organization_id = current_org_id() OR firebase_uid = auth.uid()::text);

-- Block users in pending status from querying other rows
CREATE POLICY restrict_pending_users ON users
    FOR SELECT
    USING (
        (SELECT status FROM users WHERE firebase_uid = auth.uid()::text) IN ('active')
        OR firebase_uid = auth.uid()::text
    );

-- Only admins can update other user roles or statuses
CREATE POLICY admin_manage_users ON users
    FOR UPDATE
    USING (
        organization_id = current_org_id() 
        AND (SELECT role FROM users WHERE firebase_uid = auth.uid()::text) = 'admin'
    );

-- ----------------------------------------------------------------------------
-- 3. Core Tenant-isolated tables (Scoped directly by organization_id)
-- ----------------------------------------------------------------------------
-- Departments, Categories, Assets, Resources, Audits
CREATE POLICY tenant_dept_policy ON departments
    FOR ALL
    USING (organization_id = current_org_id());

CREATE POLICY tenant_category_policy ON asset_categories
    FOR ALL
    USING (organization_id = current_org_id());

CREATE POLICY tenant_asset_policy ON assets
    FOR ALL
    USING (organization_id = current_org_id());

CREATE POLICY tenant_resource_policy ON resources
    FOR ALL
    USING (organization_id = current_org_id());

CREATE POLICY tenant_audit_policy ON audits
    FOR ALL
    USING (organization_id = current_org_id());

-- ----------------------------------------------------------------------------
-- 4. Indirect Tenant-isolated tables (Scoped through parent table joins)
-- ----------------------------------------------------------------------------
-- Allocations, Transfers, Returns, Bookings, Maintenance, Audit Items, Notifications, Logs

CREATE POLICY tenant_allocations_policy ON allocations
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM assets
        WHERE assets.id = allocations.asset_id AND assets.organization_id = current_org_id()
    ));

CREATE POLICY tenant_transfers_policy ON transfers
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM assets
        WHERE assets.id = transfers.asset_id AND assets.organization_id = current_org_id()
    ));

CREATE POLICY tenant_bookings_policy ON bookings
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM resources
        WHERE resources.id = bookings.resource_id AND resources.organization_id = current_org_id()
    ));

CREATE POLICY tenant_maintenance_policy ON maintenance_requests
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM assets
        WHERE assets.id = maintenance_requests.asset_id AND assets.organization_id = current_org_id()
    ));

CREATE POLICY tenant_notifications_policy ON notifications
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = notifications.user_id AND users.organization_id = current_org_id()
    ));
