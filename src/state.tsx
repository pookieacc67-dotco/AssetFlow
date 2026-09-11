import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User,
  Organization,
  Department,
  AssetCategory,
  Asset,
  Allocation,
  TransferRequest,
  Resource,
  Booking,
  MaintenanceRequest,
  AuditCycle,
  Notification,
  ActivityLog,
  UserRole
} from "./types";

interface AssetFlowContextType {
  currentUser: User | null;
  currentOrg: Organization | null;
  organizations: Organization[];
  users: User[];
  departments: Department[];
  categories: AssetCategory[];
  assets: Asset[];
  allocations: Allocation[];
  transfers: TransferRequest[];
  resources: Resource[];
  bookings: Booking[];
  maintenance: MaintenanceRequest[];
  audits: AuditCycle[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  
  // Auth Operations
  signUpAdmin: (fullName: string, companyName: string, identifier: string, phoneFlag: boolean, realOrgId?: string) => { success: boolean; userId: string; orgId?: string };
  signUpEmployee: (fullName: string, orgCode: string, identifier: string, phoneFlag: boolean) => { success: boolean; userId: string; pending: boolean };
  verifyOTP: (userId: string, code: string) => { success: boolean; user: User | null };
  login: (identifier: string) => { success: boolean; user?: User; error?: string };
  logout: () => void;
  
  // Organization Setup
  addDepartment: (name: string, headUserId?: string, parentId?: string) => void;
  updateDepartment: (id: string, fields: Partial<Department>) => void;
  addCategory: (name: string, warranty?: number, customFields?: string[]) => void;
  updateCategory: (id: string, fields: Partial<AssetCategory>) => void;
  deleteCategory: (id: string) => void;
  approveUser: (userId: string, role: UserRole, departmentId?: string) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  rejectUser: (userId: string) => void;
  updateOrgProfile: (fields: Partial<Organization>) => void;
  
  // Asset Management
  registerAsset: (fields: Omit<Asset, "tag" | "status">) => Asset;
  updateAsset: (tag: string, fields: Partial<Asset>) => void;
  allocateAsset: (assetTag: string, userId: string, expectedReturnDate: string) => { success: boolean; message: string };
  returnAsset: (assetTag: string) => void;
  requestTransfer: (assetTag: string, toUserId: string, reason: string) => { success: boolean; message: string };
  approveTransfer: (transferId: string) => void;
  rejectTransfer: (transferId: string) => void;
  
  // Resource Booking
  addResource: (name: string, type: "Room" | "Vehicle" | "Equipment", requiresApproval: boolean) => void;
  bookResource: (resourceId: string, start: string, end: string) => { success: boolean; message: string };
  approveBooking: (bookingId: string) => void;
  rejectBooking: (bookingId: string) => void;
  
  // Maintenance Management
  raiseMaintenance: (assetTag: string, description: string) => void;
  updateMaintenanceStatus: (id: string, status: MaintenanceRequest["status"], assignedTech?: string) => void;
  
  // Audits
  startAudit: (scope: string, auditorIds: string[], assetTags: string[]) => void;
  verifyAuditItem: (auditId: string, assetTag: string, status: "Verified" | "Missing" | "Damaged") => void;
  closeAudit: (auditId: string) => void;
  
  // System Notifications
  markNotificationsRead: () => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

const AssetFlowContext = createContext<AssetFlowContextType | undefined>(undefined);

const SEEDED_CATEGORIES: AssetCategory[] = [
  { id: "cat-1", name: "Electronics", warrantyPeriodMonths: 24, customFields: ["Processor", "RAM", "Storage"] },
  { id: "cat-2", name: "Furniture", warrantyPeriodMonths: 60, customFields: ["Material", "Dimensions"] },
  { id: "cat-3", name: "Vehicles", warrantyPeriodMonths: 36, customFields: ["License Plate", "Fuel Type"] },
  { id: "cat-4", name: "IT Equipment", warrantyPeriodMonths: 12, customFields: ["Brand", "OS"] },
  { id: "cat-5", name: "Office Supplies", warrantyPeriodMonths: 0, customFields: [] }
];

export const AssetFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Clear any existing mock/sample data in local storage once to guarantee a clean start
  useEffect(() => {
    const rawUsers = localStorage.getItem("af_users") || "";
    if (rawUsers.includes("usr-jane") || rawUsers.includes("usr-bob") || rawUsers.includes("usr-sarah")) {
      const keysToClear = [
        "af_organizations", "af_users", "af_departments", "af_categories", 
        "af_assets", "af_allocations", "af_transfers", "af_resources", 
        "af_bookings", "af_maintenance", "af_audits", "af_notifications", 
        "af_activity_logs", "af_current_user"
      ];
      keysToClear.forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  }, []);

  // Master state tables
  const [organizations, setOrganizations] = useState<Organization[]>(() => 
    JSON.parse(localStorage.getItem("af_organizations") || "[]")
  );
  const [users, setUsers] = useState<User[]>(() => 
    JSON.parse(localStorage.getItem("af_users") || "[]")
  );
  const [departments, setDepartments] = useState<Department[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_departments`) || "[]");
  });

  const [categories, setCategories] = useState<AssetCategory[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    const stored = localStorage.getItem(`${orgId}_categories`);
    if (stored) return JSON.parse(stored);
    const seeded = SEEDED_CATEGORIES.map(c => ({ ...c, id: `${orgId}-${c.id}` }));
    localStorage.setItem(`${orgId}_categories`, JSON.stringify(seeded));
    return seeded;
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_assets`) || "[]");
  });

  const [allocations, setAllocations] = useState<Allocation[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_allocations`) || "[]");
  });

  const [transfers, setTransfers] = useState<TransferRequest[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_transfers`) || "[]");
  });

  const [resources, setResources] = useState<Resource[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_resources`) || "[]");
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_bookings`) || "[]");
  });

  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_maintenance`) || "[]");
  });

  const [audits, setAudits] = useState<AuditCycle[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_audits`) || "[]");
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_notifications`) || "[]");
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const cachedUser = localStorage.getItem("af_current_user");
    if (!cachedUser) return [];
    const orgId = JSON.parse(cachedUser).organizationId;
    return JSON.parse(localStorage.getItem(`${orgId}_activity_logs`) || "[]");
  });
  
  // Theme & Session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("af_current_user");
    return cached ? JSON.parse(cached) : null;
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const cached = localStorage.getItem("af_theme") as "light" | "dark" | null;
    return cached || "light";
  });

  // Get active organization based on current logged in user
  const currentOrg = currentUser 
    ? organizations.find(o => o.id === currentUser.organizationId) || null 
    : null;

  // Persist back to local storage
  useEffect(() => {
    localStorage.setItem("af_organizations", JSON.stringify(organizations));
  }, [organizations]);

  useEffect(() => {
    localStorage.setItem("af_users", JSON.stringify(users));
  }, [users]);

  // Load organization-scoped data dynamically when currentUser changes
  useEffect(() => {
    if (currentUser) {
      const orgId = currentUser.organizationId;
      setDepartments(JSON.parse(localStorage.getItem(`${orgId}_departments`) || "[]"));
      
      const storedCats = localStorage.getItem(`${orgId}_categories`);
      if (storedCats) {
        setCategories(JSON.parse(storedCats));
      } else {
        const seeded = SEEDED_CATEGORIES.map(c => ({ ...c, id: `${orgId}-${c.id}` }));
        setCategories(seeded);
        localStorage.setItem(`${orgId}_categories`, JSON.stringify(seeded));
      }

      setAssets(JSON.parse(localStorage.getItem(`${orgId}_assets`) || "[]"));
      setAllocations(JSON.parse(localStorage.getItem(`${orgId}_allocations`) || "[]"));
      setTransfers(JSON.parse(localStorage.getItem(`${orgId}_transfers`) || "[]"));
      setResources(JSON.parse(localStorage.getItem(`${orgId}_resources`) || "[]"));
      setBookings(JSON.parse(localStorage.getItem(`${orgId}_bookings`) || "[]"));
      setMaintenance(JSON.parse(localStorage.getItem(`${orgId}_maintenance`) || "[]"));
      setAudits(JSON.parse(localStorage.getItem(`${orgId}_audits`) || "[]"));
      setNotifications(JSON.parse(localStorage.getItem(`${orgId}_notifications`) || "[]"));
      setActivityLogs(JSON.parse(localStorage.getItem(`${orgId}_activity_logs`) || "[]"));
    } else {
      setDepartments([]);
      setCategories([]);
      setAssets([]);
      setAllocations([]);
      setTransfers([]);
      setResources([]);
      setBookings([]);
      setMaintenance([]);
      setAudits([]);
      setNotifications([]);
      setActivityLogs([]);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_departments`, JSON.stringify(departments));
    }
  }, [departments, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_categories`, JSON.stringify(categories));
    }
  }, [categories, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_assets`, JSON.stringify(assets));
    }
  }, [assets, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_allocations`, JSON.stringify(allocations));
    }
  }, [allocations, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_transfers`, JSON.stringify(transfers));
    }
  }, [transfers, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_resources`, JSON.stringify(resources));
    }
  }, [resources, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_bookings`, JSON.stringify(bookings));
    }
  }, [bookings, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_maintenance`, JSON.stringify(maintenance));
    }
  }, [maintenance, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_audits`, JSON.stringify(audits));
    }
  }, [audits, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_notifications`, JSON.stringify(notifications));
    }
  }, [notifications, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`${currentUser.organizationId}_activity_logs`, JSON.stringify(activityLogs));
    }
  }, [activityLogs, currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("af_current_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("af_current_user");
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("af_theme", theme);
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Activity logger helper
  const logActivity = (userId: string, action: string, note: string, assetTag?: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newLog: ActivityLog = {
      id: "log-" + Math.random().toString(36).substring(2, 9),
      userId,
      fullName: user.fullName,
      role: user.role,
      assetTag,
      action,
      note,
      createdAt: new Date().toISOString()
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  // Notification helper
  const addNotification = (userId: string, title: string, message: string, type: Notification["type"]) => {
    const newNotif: Notification = {
      id: "notif-" + Math.random().toString(36).substring(2, 9),
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Seed sample data helper to populate rich operational data for the current workspace
  const seedSampleDataForUser = (user: User) => {
    const orgId = user.organizationId;

    // 1. Seed Departments
    const depts: Department[] = [
      { id: "dept-eng", name: "Engineering", headUserId: "usr-jane", status: "Active" },
      { id: "dept-mkt", name: "Marketing", headUserId: "usr-sarah", status: "Active" },
      { id: "dept-ops", name: "Operations", headUserId: "usr-marcus", status: "Active" },
      { id: "dept-fin", name: "Finance", headUserId: "usr-robert", status: "Active" }
    ];

    // 2. Seed Team Users
    const newUsers: User[] = [
      {
        id: "usr-jane",
        email: "jane@acme.com",
        fullName: "Jane Doe",
        role: "Department Head",
        organizationId: orgId,
        departmentId: "dept-eng",
        status: "approved",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "usr-sarah",
        email: "sarah@acme.com",
        fullName: "Sarah Jenkins",
        role: "Department Head",
        organizationId: orgId,
        departmentId: "dept-mkt",
        status: "approved",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "usr-marcus",
        email: "marcus@acme.com",
        fullName: "Marcus Vance",
        role: "Department Head",
        organizationId: orgId,
        departmentId: "dept-ops",
        status: "approved",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "usr-robert",
        email: "robert@acme.com",
        fullName: "Robert Chen",
        role: "Department Head",
        organizationId: orgId,
        departmentId: "dept-fin",
        status: "approved",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "usr-alice",
        email: "alice@acme.com",
        fullName: "Alice Smith",
        role: "Asset Manager",
        organizationId: orgId,
        departmentId: "dept-ops",
        status: "approved",
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "usr-bob",
        email: "bob@acme.com",
        fullName: "Bob Johnson",
        role: "Employee",
        organizationId: orgId,
        departmentId: "dept-eng",
        status: "approved",
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "usr-charlie",
        email: "charlie@acme.com",
        fullName: "Charlie Brown",
        role: "Employee",
        organizationId: orgId,
        departmentId: "dept-eng",
        status: "approved",
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "usr-david",
        email: "david@acme.com",
        fullName: "David Lee",
        role: "Employee",
        organizationId: orgId,
        departmentId: "dept-mkt",
        status: "approved",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const currentInList = users.find(u => u.id === user.id);
    const updatedUsers = [
      ...(currentInList ? [] : [user]),
      ...users.filter(u => u.id !== user.id),
      ...newUsers
    ];

    const updatedCategories = categories.length > 0 ? categories : SEEDED_CATEGORIES;

    // 3. Seed Assets
    const seededAssets: Asset[] = [
      {
        tag: "AST-1001",
        name: 'MacBook Pro 16" (M3 Max)',
        categoryId: "cat-4",
        status: "Allocated",
        location: "HQ - Floor 3 (Engineering)",
        serialNumber: "C02FT512Q05D",
        acquisitionDate: "2025-01-15",
        condition: "New"
      },
      {
        tag: "AST-1002",
        name: "iPhone 15 Pro Max",
        categoryId: "cat-1",
        status: "Allocated",
        location: "HQ - Floor 5 (Marketing)",
        serialNumber: "DNPWF819Q05G",
        acquisitionDate: "2025-02-10",
        condition: "New"
      },
      {
        tag: "AST-1003",
        name: "Dell UltraSharp 32\" 4K Hub Monitor",
        categoryId: "cat-4",
        status: "Available",
        location: "HQ - IT Storage Room",
        serialNumber: "CN-0Y620X-74445",
        acquisitionDate: "2024-11-05",
        condition: "Good"
      },
      {
        tag: "AST-1004",
        name: "Tesla Model Y Long Range",
        categoryId: "cat-3",
        status: "Allocated",
        location: "HQ - Executive Parking Area",
        serialNumber: "5YJYGAEE6PF12345",
        acquisitionDate: "2024-06-18",
        condition: "Good"
      },
      {
        tag: "AST-1005",
        name: "Herman Miller Aeron Chair",
        categoryId: "cat-2",
        status: "Available",
        location: "HQ - Logistics Storage A",
        serialNumber: "HM-AERON-99881",
        acquisitionDate: "2023-08-22",
        condition: "Good"
      },
      {
        tag: "AST-1006",
        name: "Standing Desk Pro",
        categoryId: "cat-2",
        status: "Allocated",
        location: "HQ - Floor 3 (Engineering)",
        serialNumber: "SD-MAPLE-77112",
        acquisitionDate: "2024-01-20",
        condition: "Good"
      },
      {
        tag: "AST-1007",
        name: "Lenovo ThinkPad X1 Carbon Gen 11",
        categoryId: "cat-4",
        status: "Under Maintenance",
        location: "HQ - IT Lab / Diagnostics",
        serialNumber: "PF-4Y8812",
        acquisitionDate: "2024-03-12",
        condition: "Fair"
      },
      {
        tag: "AST-1008",
        name: "Sony WH-1000XM5 Headphones",
        categoryId: "cat-1",
        status: "Allocated",
        location: "HQ - Floor 5 (Marketing)",
        serialNumber: "SONY-XM5-10103",
        acquisitionDate: "2025-01-08",
        condition: "Good"
      },
      {
        tag: "AST-1009",
        name: "iPad Pro 12.9\" (M2)",
        categoryId: "cat-1",
        status: "Allocated",
        location: "HQ - Floor 5 (Design Desk)",
        serialNumber: "DLXGF881Q05H",
        acquisitionDate: "2024-09-02",
        condition: "New"
      },
      {
        tag: "AST-1010",
        name: "Canon EOS R5 Mirrorless Camera",
        categoryId: "cat-1",
        status: "Available",
        location: "HQ - Creative Lab",
        serialNumber: "CA-R5-88310",
        acquisitionDate: "2024-07-15",
        condition: "New"
      }
    ];

    // 4. Seed Allocations
    const seededAllocations: Allocation[] = [
      {
        id: "alloc-1",
        assetTag: "AST-1001",
        userId: "usr-bob",
        assignedDate: "2025-01-16",
        expectedReturnDate: "2026-10-16",
        status: "Active"
      },
      {
        id: "alloc-2",
        assetTag: "AST-1002",
        userId: "usr-jane",
        assignedDate: "2025-02-11",
        expectedReturnDate: "2026-11-11",
        status: "Active"
      },
      {
        id: "alloc-3",
        assetTag: "AST-1004",
        userId: "usr-marcus",
        assignedDate: "2024-06-19",
        expectedReturnDate: "2027-06-19",
        status: "Active"
      },
      {
        id: "alloc-4",
        assetTag: "AST-1006",
        userId: "usr-charlie",
        assignedDate: "2024-01-21",
        expectedReturnDate: "2027-01-21",
        status: "Active"
      },
      {
        id: "alloc-5",
        assetTag: "AST-1008",
        userId: "usr-david",
        assignedDate: "2025-01-09",
        expectedReturnDate: "2026-07-09",
        status: "Active"
      },
      {
        id: "alloc-6",
        assetTag: "AST-1009",
        userId: "usr-sarah",
        assignedDate: "2024-09-03",
        expectedReturnDate: "2026-09-03",
        status: "Active"
      }
    ];

    // 5. Seed Transfer Requests
    const seededTransfers: TransferRequest[] = [
      {
        id: "trf-1",
        assetTag: "AST-1001",
        fromUserId: "usr-bob",
        toUserId: "usr-charlie",
        reason: "Bob is shifting to the mobile development team and needs a specialized iOS testing setup, while Charlie is starting on backend services.",
        status: "Pending",
        createdAt: new Date().toISOString()
      }
    ];

    // 6. Seed Resources
    const seededResources: Resource[] = [
      { id: "res-1", name: "Boardroom Alpha (Floor 4)", type: "Room", requiresApproval: false },
      { id: "res-2", name: "Executive Lounge (Floor 1)", type: "Room", requiresApproval: true },
      { id: "res-3", name: "Tesla Model 3 - Vehicle #1", type: "Vehicle", requiresApproval: true },
      { id: "res-4", name: "Video Production Studio kit", type: "Equipment", requiresApproval: false }
    ];

    // 7. Seed Bookings
    const seededBookings: Booking[] = [
      {
        id: "bkg-1",
        resourceId: "res-1",
        userId: "usr-bob",
        start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        status: "Confirmed",
        createdAt: new Date().toISOString()
      },
      {
        id: "bkg-2",
        resourceId: "res-2",
        userId: "usr-sarah",
        start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        status: "Confirmed",
        createdAt: new Date().toISOString()
      },
      {
        id: "bkg-3",
        resourceId: "res-4",
        userId: "usr-david",
        start: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        status: "Confirmed",
        createdAt: new Date().toISOString()
      },
      {
        id: "bkg-4",
        resourceId: "res-3",
        userId: "usr-marcus",
        start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        end: new Date(Date.now() + 56 * 60 * 60 * 1000).toISOString(),
        status: "Pending Approval",
        createdAt: new Date().toISOString()
      }
    ];

    // 8. Seed Maintenance
    const seededMaintenance: MaintenanceRequest[] = [
      {
        id: "mnt-1",
        assetTag: "AST-1003",
        userId: "usr-alice",
        description: "Screen flickers when connected via USB-C alt mode. Verified with multiple laptops.",
        status: "Resolved",
        assignedTech: "IT Support Team",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "mnt-2",
        assetTag: "AST-1007",
        userId: "usr-bob",
        description: "Battery swelling causing keyboard deformation. Unit is hot to touch and unsafe for use.",
        status: "In Progress",
        assignedTech: "Lenovo Premier Care",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // 9. Seed Audits
    const seededAudits: AuditCycle[] = [
      {
        id: "adt-1",
        scope: "Q3 IT Infrastructure Hardware Audit",
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "Active",
        auditorIds: ["usr-alice"],
        items: {
          "AST-1001": "Verified",
          "AST-1003": "Verified",
          "AST-1007": "Damaged"
        }
      }
    ];

    // 10. Seed Notifications
    const seededNotifications: Notification[] = [
      {
        id: "notif-1",
        userId: user.id,
        title: "Transfer Pending Approval",
        message: "Bob Johnson requested to transfer MacBook Pro 16\" (AST-1001) to Charlie Brown.",
        type: "approval",
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: "notif-2",
        userId: user.id,
        title: "Booking Approval Required",
        message: "Marcus Vance requested to book Tesla Model 3 - Vehicle #1 for next Tuesday.",
        type: "booking",
        isRead: false,
        createdAt: new Date().toISOString()
      },
      {
        id: "notif-3",
        userId: user.id,
        title: "Maintenance Alert",
        message: "Lenovo ThinkPad X1 Carbon Gen 11 (AST-1007) reported with swelling battery.",
        type: "alert",
        isRead: false,
        createdAt: new Date().toISOString()
      }
    ];

    // 11. Seed Activity Logs
    const seededLogs: ActivityLog[] = [
      {
        id: "log-1",
        userId: user.id,
        fullName: user.fullName,
        role: user.role,
        action: "Logged In",
        note: "Authenticated successfully via OAuth secure portal",
        createdAt: new Date().toISOString()
      },
      {
        id: "log-2",
        userId: "usr-alice",
        fullName: "Alice Smith",
        role: "Asset Manager",
        action: "Audit Cycle Started",
        note: "Started Q3 IT Infrastructure Hardware Audit",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "log-3",
        userId: "usr-bob",
        fullName: "Bob Johnson",
        role: "Employee",
        action: "Maintenance Filed",
        note: "Filed repair ticket for AST-1007: Battery swelling causing keyboard deformation.",
        assetTag: "AST-1007",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "log-4",
        userId: "usr-marcus",
        fullName: "Marcus Vance",
        role: "Department Head",
        action: "Resource Booked",
        note: "Booked Tesla Model 3 - Vehicle #1",
        createdAt: new Date().toISOString()
      },
      {
        id: "log-5",
        userId: "usr-bob",
        fullName: "Bob Johnson",
        role: "Employee",
        action: "Transfer Requested",
        note: "Requested transfer of AST-1001 to Charlie Brown",
        assetTag: "AST-1001",
        createdAt: new Date().toISOString()
      }
    ];

    // Update state variables to trigger re-render and persist in local storage
    setDepartments(depts);
    setUsers(updatedUsers);
    setCategories(updatedCategories);
    setAssets(seededAssets);
    setAllocations(seededAllocations);
    setTransfers(seededTransfers);
    setResources(seededResources);
    setBookings(seededBookings);
    setMaintenance(seededMaintenance);
    setAudits(seededAudits);
    setNotifications(seededNotifications);
    setActivityLogs(seededLogs);
  };

  // Seeding sample data helper has been completely removed to comply with clean database start constraints.
  // The database now starts entirely empty of mock resources, allocations, and assets.

  // --- Auth Operations ---

  const signUpAdmin = (fullName: string, companyName: string, identifier: string, phoneFlag: boolean, realOrgId?: string) => {
    // Generate a unique random organization code formatted like ORG_XXXXXX
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomStr = "";
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const orgId = realOrgId || `ORG_${randomStr}`;
    const userId = "usr-" + Math.random().toString(36).substring(2, 9);

    const newOrg: Organization = {
      id: orgId,
      name: companyName
    };

    const newUser: User = {
      id: userId,
      email: phoneFlag ? "" : identifier,
      phone: phoneFlag ? identifier : "",
      fullName,
      role: "Admin",
      organizationId: orgId,
      status: "approved",
      createdAt: new Date().toISOString()
    };

    setOrganizations(prev => [...prev, newOrg]);
    setUsers(prev => [...prev, newUser]);

    if (!phoneFlag) {
      setCurrentUser(newUser);
    }

    // Pre-populate Categories for this new org in global categories array
    // Wait, categories are scoped to org. We'll store them in standard list
    // and let them be configured, we can seed standard ones if list is empty
    if (categories.length === 0) {
      setCategories(SEEDED_CATEGORIES);
    }

    return { success: true, userId, orgId };
  };

  const signUpEmployee = (fullName: string, orgCode: string, identifier: string, phoneFlag: boolean) => {
    const org = organizations.find(o => o.id === orgCode || o.name.toLowerCase() === orgCode.toLowerCase());
    const orgId = org ? org.id : orgCode;
    const userId = "usr-" + Math.random().toString(36).substring(2, 9);

    const newUser: User = {
      id: userId,
      email: phoneFlag ? "" : identifier,
      phone: phoneFlag ? identifier : "",
      fullName,
      role: "Employee",
      organizationId: orgId,
      status: "pending_approval",
      createdAt: new Date().toISOString()
    };

    setUsers(prev => [...prev, newUser]);
    return { success: true, userId, pending: true };
  };

  const verifyOTP = (userId: string, code: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, user: null };

    // Validate code is the mock code "123456"
    if (code !== "123456") {
      return { success: false, user: null };
    }

    if (user.status === "approved") {
      setCurrentUser(user);
      logActivity(user.id, "Logged In", "Authenticated successfully via OTP");
    } else {
      // Find Admin of this org to notify them
      const admin = users.find(u => u.organizationId === user.organizationId && u.role === "Admin");
      if (admin) {
        addNotification(
          admin.id,
          "New Member Registration",
          `${user.fullName} requested to join ${organizations.find(o => o.id === user.organizationId)?.name || 'your company'}.`,
          "approval"
        );
      }
    }
    return { success: true, user: user.status === "approved" ? user : null };
  };

  const login = (identifier: string) => {
    const cleanId = identifier.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === cleanId || (u.phone && u.phone === identifier.trim()) || u.fullName.toLowerCase() === cleanId);
    if (!user) {
      return { success: false, error: "Account not found. Please register first!" };
    }

    if (user.status === "pending_approval") {
      return { success: false, error: "Your registration is still pending Admin approval." };
    }

    setCurrentUser(user);
    logActivity(user.id, "Logged In", "Authenticated successfully");
    return { success: true, user };
  };

  const logout = () => {
    if (currentUser) {
      logActivity(currentUser.id, "Logged Out", "Session ended");
    }
    setCurrentUser(null);
  };

  // --- Org Setup Operations ---

  const addDepartment = (name: string, headUserId?: string, parentId?: string) => {
    if (!currentUser) return;
    const newDept: Department = {
      id: "dept-" + Math.random().toString(36).substring(2, 9),
      name,
      headUserId,
      parentDepartmentId: parentId,
      status: "Active"
    };
    setDepartments(prev => [...prev, newDept]);
    logActivity(currentUser.id, "Department Created", `Added department: ${name}`);
  };

  const updateDepartment = (id: string, fields: Partial<Department>) => {
    if (!currentUser) return;
    setDepartments(prev => prev.map(d => d.id === id ? { ...d, ...fields } : d));
    logActivity(currentUser.id, "Department Updated", `Modified department: ${id}`);
  };

  const addCategory = (name: string, warranty = 0, customFields: string[] = []) => {
    const newCat: AssetCategory = {
      id: "cat-" + Math.random().toString(36).substring(2, 9),
      name,
      warrantyPeriodMonths: warranty,
      customFields
    };
    setCategories(prev => [...prev, newCat]);
    if (currentUser) {
      logActivity(currentUser.id, "Category Created", `Added asset category: ${name}`);
    }
  };

  const updateCategory = (id: string, fields: Partial<AssetCategory>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    if (currentUser) {
      logActivity(currentUser.id, "Category Updated", `Modified asset category: ${id}`);
    }
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    if (currentUser) {
      logActivity(currentUser.id, "Category Deleted", `Removed asset category: ${id}`);
    }
  };

  const approveUser = (userId: string, role: UserRole, departmentId?: string) => {
    if (!currentUser) return;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: "approved", role, departmentId } : u));
    logActivity(currentUser.id, "User Approved", `Approved user ${userId} as ${role}`);
    addNotification(userId, "Account Approved", `Your AssetFlow account has been approved by the Admin as ${role}!`, "system");
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    if (!currentUser) return;
    setUsers(prev => {
      const nextUsers = prev.map(u => u.id === userId ? { ...u, role } : u);
      localStorage.setItem("af_users", JSON.stringify(nextUsers));
      return nextUsers;
    });
    if (currentUser.id === userId) {
      setCurrentUser(prev => {
        const nextUser = prev ? { ...prev, role } : null;
        localStorage.setItem("af_current_user", JSON.stringify(nextUser));
        return nextUser;
      });
    }
    logActivity(currentUser.id, "User Role Updated", `Updated user ${userId}'s role to ${role}`);
    addNotification(userId, "Role Updated", `Your role has been updated to ${role} by the Admin.`, "system");
  };

  const rejectUser = (userId: string) => {
    if (!currentUser) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
    logActivity(currentUser.id, "User Rejected", `Rejected joining request: ${userId}`);
  };

  const updateOrgProfile = (fields: Partial<Organization>) => {
    if (!currentUser || !currentOrg) return;
    setOrganizations(prev => prev.map(o => o.id === currentOrg.id ? { ...o, ...fields } : o));
    logActivity(currentUser.id, "Org Profile Updated", "Company profile was modified");
  };

  // --- Asset Operations ---

  const registerAsset = (fields: Omit<Asset, "tag" | "status">) => {
    const tagIndex = assets.length + 1001;
    const tag = `AST-${tagIndex}`;
    const newAsset: Asset = {
      ...fields,
      tag,
      status: "Available"
    };
    setAssets(prev => [...prev, newAsset]);
    if (currentUser) {
      logActivity(currentUser.id, "Asset Registered", `Registered new asset: ${fields.name} (${tag})`, tag);
    }
    return newAsset;
  };

  const updateAsset = (tag: string, fields: Partial<Asset>) => {
    setAssets(prev => prev.map(a => a.tag === tag ? { ...a, ...fields } : a));
    if (currentUser) {
      logActivity(currentUser.id, "Asset Updated", `Updated fields for ${tag}`, tag);
    }
  };

  const allocateAsset = (assetTag: string, userId: string, expectedReturnDate: string) => {
    if (!currentUser) return { success: false, message: "User session lost" };
    
    const asset = assets.find(a => a.tag === assetTag);
    if (!asset) return { success: false, message: "Asset not found" };

    if (asset.status !== "Available") {
      const activeAlloc = allocations.find(al => al.assetTag === assetTag && al.status === "Active");
      const holder = activeAlloc ? users.find(u => u.id === activeAlloc.userId) : null;
      return { 
        success: false, 
        message: `Asset is already held by ${holder ? holder.fullName : "another user"}. Create a transfer request instead.` 
      };
    }

    // Mark asset as Allocated
    setAssets(prev => prev.map(a => a.tag === assetTag ? { ...a, status: "Allocated" } : a));

    const newAlloc: Allocation = {
      id: "alloc-" + Math.random().toString(36).substring(2, 9),
      assetTag,
      userId,
      assignedDate: new Date().toISOString().split("T")[0],
      expectedReturnDate,
      status: "Active"
    };

    setAllocations(prev => [...prev, newAlloc]);
    logActivity(currentUser.id, "Asset Allocated", `Allocated ${asset.name} to ${users.find(u => u.id === userId)?.fullName}`, assetTag);
    addNotification(userId, "Asset Allocated", `You have been allocated asset: ${asset.name} (${assetTag})`, "system");
    return { success: true, message: "Asset allocated successfully" };
  };

  const returnAsset = (assetTag: string) => {
    if (!currentUser) return;
    setAssets(prev => prev.map(a => a.tag === assetTag ? { ...a, status: "Available" } : a));
    setAllocations(prev => prev.map(al => al.assetTag === assetTag && al.status === "Active" 
      ? { ...al, status: "Returned", actualReturnDate: new Date().toISOString().split("T")[0] } 
      : al
    ));
    logActivity(currentUser.id, "Asset Returned", `Returned asset: ${assetTag}`, assetTag);
  };

  const requestTransfer = (assetTag: string, toUserId: string, reason: string) => {
    if (!currentUser) return { success: false, message: "Auth required" };
    
    const newRequest: TransferRequest = {
      id: "trf-" + Math.random().toString(36).substring(2, 9),
      assetTag,
      fromUserId: currentUser.id,
      toUserId,
      reason,
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    setTransfers(prev => [newRequest, ...prev]);
    logActivity(currentUser.id, "Transfer Requested", `Requested transfer of ${assetTag} to ${users.find(u => u.id === toUserId)?.fullName}`, assetTag);

    // Notify Department Head and target Employee
    const deptHead = users.find(u => u.departmentId === currentUser.departmentId && u.role === "Department Head");
    if (deptHead) {
      addNotification(deptHead.id, "Transfer Pending Approval", `${currentUser.fullName} requested to transfer ${assetTag}`, "approval");
    }
    return { success: true, message: "Transfer request submitted successfully. Awaiting Approval." };
  };

  const approveTransfer = (transferId: string) => {
    if (!currentUser) return;
    const req = transfers.find(t => t.id === transferId);
    if (!req) return;

    // Set old allocation to returned
    setAllocations(prev => prev.map(al => al.assetTag === req.assetTag && al.status === "Active" 
      ? { ...al, status: "Returned", actualReturnDate: new Date().toISOString().split("T")[0] } 
      : al
    ));

    // Create new allocation
    const newAlloc: Allocation = {
      id: "alloc-" + Math.random().toString(36).substring(2, 9),
      assetTag: req.assetTag,
      userId: req.toUserId,
      assignedDate: new Date().toISOString().split("T")[0],
      expectedReturnDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // default 30 days
      status: "Active"
    };

    setAllocations(prev => [...prev, newAlloc]);
    setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: "Approved" } : t));
    setAssets(prev => prev.map(a => a.tag === req.assetTag ? { ...a, status: "Allocated" } : a));

    logActivity(currentUser.id, "Transfer Approved", `Approved transfer of ${req.assetTag}`, req.assetTag);
    addNotification(req.toUserId, "Asset Transferred", `Asset ${req.assetTag} has been successfully transferred to you.`, "system");
    addNotification(req.fromUserId, "Transfer Approved", `Your request to transfer ${req.assetTag} was approved.`, "system");
  };

  const rejectTransfer = (transferId: string) => {
    if (!currentUser) return;
    const req = transfers.find(t => t.id === transferId);
    if (!req) return;

    setTransfers(prev => prev.map(t => t.id === transferId ? { ...t, status: "Rejected" } : t));
    logActivity(currentUser.id, "Transfer Rejected", `Rejected transfer of ${req.assetTag}`, req.assetTag);
    addNotification(req.fromUserId, "Transfer Rejected", `Your request to transfer ${req.assetTag} was rejected.`, "system");
  };

  // --- Resource Bookings ---

  const addResource = (name: string, type: "Room" | "Vehicle" | "Equipment", requiresApproval: boolean) => {
    if (!currentUser) return;
    const newRes: Resource = {
      id: "res-" + Math.random().toString(36).substring(2, 9),
      name,
      type,
      requiresApproval
    };
    setResources(prev => [...prev, newRes]);
    logActivity(currentUser.id, "Resource Created", `Created shareable resource: ${name} (${type})`);
  };

  const bookResource = (resourceId: string, start: string, end: string) => {
    if (!currentUser) return { success: false, message: "Session required" };

    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return { success: false, message: "Resource not found" };

    // Overlap checks
    const hasOverlap = bookings.some(b => {
      if (b.resourceId !== resourceId || b.status === "Cancelled" || b.status === "Rejected") return false;
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();
      const rStart = new Date(start).getTime();
      const rEnd = new Date(end).getTime();
      return rStart < bEnd && rEnd > bStart;
    });

    if (hasOverlap) {
      return { success: false, message: "Booking conflict detected. This time window is already occupied." };
    }

    const requiresApproval = resource.requiresApproval;
    const newBooking: Booking = {
      id: "bkg-" + Math.random().toString(36).substring(2, 9),
      resourceId,
      userId: currentUser.id,
      start,
      end,
      status: requiresApproval ? "Pending Approval" : "Confirmed",
      createdAt: new Date().toISOString()
    };

    setBookings(prev => [...prev, newBooking]);
    logActivity(currentUser.id, "Resource Booked", `Booked ${resource.name} from ${start} to ${end}`);

    if (requiresApproval) {
      const deptHead = users.find(u => u.departmentId === currentUser.departmentId && u.role === "Department Head");
      const approverId = deptHead ? deptHead.id : users.find(u => u.role === "Admin")?.id;
      if (approverId) {
        addNotification(approverId, "Booking Approval Required", `${currentUser.fullName} requested to book ${resource.name}`, "booking");
      }
    }

    return { 
      success: true, 
      message: requiresApproval ? "Booking requested. Awaiting approval." : "Booking confirmed instantly!" 
    };
  };

  const approveBooking = (bookingId: string) => {
    if (!currentUser) return;
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "Confirmed" } : b));
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      logActivity(currentUser.id, "Booking Approved", `Confirmed booking ${bookingId}`);
      addNotification(booking.userId, "Booking Confirmed", `Your booking for resource was confirmed.`, "booking");
    }
  };

  const rejectBooking = (bookingId: string) => {
    if (!currentUser) return;
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: "Rejected" } : b));
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      logActivity(currentUser.id, "Booking Rejected", `Rejected booking ${bookingId}`);
      addNotification(booking.userId, "Booking Rejected", `Your booking request was declined.`, "booking");
    }
  };

  // --- Maintenance Management ---

  const raiseMaintenance = (assetTag: string, description: string) => {
    if (!currentUser) return;
    const newReq: MaintenanceRequest = {
      id: "mnt-" + Math.random().toString(36).substring(2, 9),
      assetTag,
      userId: currentUser.id,
      description,
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    setMaintenance(prev => [...prev, newReq]);
    setAssets(prev => prev.map(a => a.tag === assetTag ? { ...a, status: "Under Maintenance" } : a));
    logActivity(currentUser.id, "Maintenance Filed", `Filed repair ticket for ${assetTag}: ${description}`, assetTag);
    
    // Notify Asset Manager
    const mgr = users.find(u => u.role === "Asset Manager");
    if (mgr) {
      addNotification(mgr.id, "Maintenance Alert", `New damage ticket submitted for ${assetTag}`, "alert");
    }
  };

  const updateMaintenanceStatus = (id: string, status: MaintenanceRequest["status"], assignedTech?: string) => {
    if (!currentUser) return;
    setMaintenance(prev => prev.map(m => m.id === id ? { ...m, status, assignedTech: assignedTech || m.assignedTech } : m));
    const req = maintenance.find(m => m.id === id);
    if (!req) return;

    if (status === "Resolved") {
      setAssets(prev => prev.map(a => a.tag === req.assetTag ? { ...a, status: "Available" } : a));
    }

    logActivity(currentUser.id, "Maintenance Status Changed", `Flipped ticket ${id} to ${status}`, req.assetTag);
    addNotification(req.userId, "Maintenance Update", `Your repair ticket for ${req.assetTag} is now: ${status}`, "system");
  };

  // --- Audits ---

  const startAudit = (scope: string, auditorIds: string[], assetTags: string[]) => {
    if (!currentUser) return;
    const cycleItems: { [tag: string]: "Verified" | "Missing" | "Damaged" } = {};
    assetTags.forEach(tag => {
      cycleItems[tag] = "Verified"; // default to verified
    });

    const newAudit: AuditCycle = {
      id: "adt-" + Math.random().toString(36).substring(2, 9),
      scope,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 14 days
      status: "Active",
      auditorIds,
      items: cycleItems
    };

    setAudits(prev => [...prev, newAudit]);
    logActivity(currentUser.id, "Audit Cycle Started", `Launched audit cycle: ${scope}`);

    auditorIds.forEach(id => {
      addNotification(id, "Audit Assigned", `You have been assigned to audit: ${scope}`, "system");
    });
  };

  const verifyAuditItem = (auditId: string, assetTag: string, status: "Verified" | "Missing" | "Damaged") => {
    setAudits(prev => prev.map(a => {
      if (a.id === auditId) {
        return {
          ...a,
          items: {
            ...a.items,
            [assetTag]: status
          }
        };
      }
      return a;
    }));
  };

  const closeAudit = (auditId: string) => {
    if (!currentUser) return;
    const audit = audits.find(a => a.id === auditId);
    if (!audit) return;

    // Lock and finalize
    setAudits(prev => prev.map(a => a.id === auditId 
      ? { ...a, status: "Completed", closedAt: new Date().toISOString() } 
      : a
    ));

    // Behind the scenes: flip confirmed-missing asset statuses to "Lost"
    Object.entries(audit.items).forEach(([tag, status]) => {
      if (status === "Missing") {
        setAssets(prev => prev.map(a => a.tag === tag ? { ...a, status: "Lost" } : a));
      } else if (status === "Damaged") {
        setAssets(prev => prev.map(a => a.tag === tag ? { ...a, status: "Damaged" } : a));
      }
    });

    logActivity(currentUser.id, "Audit Cycle Closed", `Locked audit results for: ${audit.scope}`);
  };

  const markNotificationsRead = () => {
    if (!currentUser) return;
    setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, isRead: true } : n));
  };

  return (
    <AssetFlowContext.Provider
      value={{
        currentUser,
        currentOrg,
        organizations,
        users,
        departments,
        categories,
        assets,
        allocations,
        transfers,
        resources,
        bookings,
        maintenance,
        audits,
        notifications: notifications.filter(n => currentUser && n.userId === currentUser.id),
        activityLogs,
        signUpAdmin,
        signUpEmployee,
        verifyOTP,
        login,
        logout,
        addDepartment,
        updateDepartment,
        addCategory,
        updateCategory,
        deleteCategory,
        approveUser,
        updateUserRole,
        rejectUser,
        updateOrgProfile,
        registerAsset,
        updateAsset,
        allocateAsset,
        returnAsset,
        requestTransfer,
        approveTransfer,
        rejectTransfer,
        addResource,
        bookResource,
        approveBooking,
        rejectBooking,
        raiseMaintenance,
        updateMaintenanceStatus,
        startAudit,
        verifyAuditItem,
        closeAudit,
        markNotificationsRead,
        theme,
        setTheme
      }}
    >
      {children}
    </AssetFlowContext.Provider>
  );
};

export const useAssetFlow = () => {
  const context = useContext(AssetFlowContext);
  if (!context) {
    throw new Error("useAssetFlow must be used within AssetFlowProvider");
  }
  return context;
};
