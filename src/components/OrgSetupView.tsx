import React, { useState } from "react";
import { useAssetFlow } from "../state";
import { UserRole } from "../types";
import { 
  Building, 
  FolderPlus, 
  Users, 
  Hourglass, 
  Settings, 
  Plus, 
  Check, 
  X, 
  Briefcase,
  Layers,
  Sparkles,
  Phone,
  Mail,
  Trash2
} from "lucide-react";

export const OrgSetupView: React.FC = () => {
  const { 
    currentOrg, 
    users, 
    departments, 
    categories, 
    addDepartment, 
    addCategory, 
    deleteCategory, 
    approveUser, 
    updateUserRole,
    rejectUser, 
    updateOrgProfile 
  } = useAssetFlow();

  const [activeTab, setActiveTab] = useState<"departments" | "categories" | "directory" | "pending" | "profile">("profile");

  // Input states
  const [deptName, setDeptName] = useState("");
  const [parentDeptId, setParentDeptId] = useState("");
  
  const [catName, setCatName] = useState("");
  const [catWarranty, setCatWarranty] = useState<number>(12);
  const [catField, setCatField] = useState("");
  const [catFieldsList, setCatFieldsList] = useState<string[]>([]);

  // Profile states
  const [orgIndustry, setOrgIndustry] = useState(currentOrg?.industry || "Logistics");
  const [orgSize, setOrgSize] = useState(currentOrg?.size || "50-100");
  const [orgAddress, setOrgAddress] = useState(currentOrg?.address || "");

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    addDepartment(deptName, undefined, parentDeptId || undefined);
    setDeptName("");
    setParentDeptId("");
  };

  const handleAddCatField = () => {
    if (catField.trim() && !catFieldsList.includes(catField.trim())) {
      setCatFieldsList([...catFieldsList, catField.trim()]);
      setCatField("");
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    addCategory(catName, catWarranty, catFieldsList);
    setCatName("");
    setCatWarranty(12);
    setCatFieldsList([]);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrgProfile({
      industry: orgIndustry,
      size: orgSize,
      address: orgAddress
    });
    alert("Company Profile saved successfully.");
  };

  const pendingApprovalUsers = users.filter(u => u.status === "pending_approval" && u.organizationId === currentOrg?.id);
  const approvedUsers = users.filter(u => u.status === "approved" && u.organizationId === currentOrg?.id);

  return (
    <div className="flex flex-col gap-6 text-left py-2">
      
      {/* Visual Section Header */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-widest">Configuration Engine</span>
        <h2 className="text-2xl font-extrabold ">Organization Setup</h2>
        <p className="text-xs text-[#15161A]">Manage departments, custom metadata, pending employees, and company details.</p>
      </div>

      {/* Tabs list (Section 7 Org Setup brief) */}
      <div className="flex flex-wrap gap-1.5 p-1  rounded-full border  self-start">
        {[
          { id: "profile", label: "Company Profile", icon: <Settings className="w-3.5 h-3.5" /> },
          { id: "departments", label: "Departments", icon: <Building className="w-3.5 h-3.5" /> },
          { id: "categories", label: "Asset Categories", icon: <FolderPlus className="w-3.5 h-3.5" /> },
          { id: "directory", label: "Employee Directory", icon: <Users className="w-3.5 h-3.5" /> },
          { id: "pending", label: `Pending Onboarding (${pendingApprovalUsers.length})`, icon: <Hourglass className="w-3.5 h-3.5" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === tab.id 
                ? "bg-[#15161A] text-white shadow-sm" 
                : "text-[#5B5E66] hover:bg-neutral-100 hover:text-[#15161A]"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      
      {/* 1. Company Profile */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="bg-white  p-6 rounded-[24px] border  shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <span className="font-bold text-base  flex items-center gap-1.5">
              <Settings className="w-4.5 h-4.5 text-[#15161A]" /> Branding & Coordinates
            </span>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Company Name</label>
              <input 
                type="text" 
                disabled 
                value={currentOrg?.name || ""} 
                className="px-4 py-2.5 rounded-[16px] border text-xs text-[#5B5E66] cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Organization Identification Code</label>
              <input 
                type="text" 
                disabled 
                value={currentOrg?.id || ""} 
                className="px-4 py-2.5 rounded-[16px] border text-xs text-[#5B5E66] font-mono select-all cursor-not-allowed"
              />
              <span className="text-[10px] text-[#5B5E66]">Share this code with employees so they can join automatically on registration.</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Industry Segment</label>
              <input 
                type="text" 
                value={orgIndustry}
                onChange={(e) => setOrgIndustry(e.target.value)}
                placeholder="Logistics, Education, Medical..." 
                className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 justify-between">
            <div className="flex flex-col gap-4">
              <span className="font-bold text-base text-transparent">Space</span>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">Company Size Group</label>
                <select 
                  value={orgSize}
                  onChange={(e) => setOrgSize(e.target.value)}
                  className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                >
                  <option value="1-20">1-20 Employees</option>
                  <option value="20-50">20-50 Employees</option>
                  <option value="50-100">50-100 Employees</option>
                  <option value="100-500">100-500 Employees</option>
                  <option value="500+">500+ Employees</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">Operational Headquarters Address</label>
                <textarea 
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  placeholder="Street name, office suite, city..." 
                  className="px-4 py-2 rounded-[16px] border bg-white text-xs focus:outline-none h-20 resize-none"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="px-6 py-3 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-95 transition-opacity self-end cursor-pointer shadow-md"
            >
              Save Company Profile
            </button>
          </div>
        </form>
      )}

      {/* 2. Departments tab */}
      {activeTab === "departments" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleAddDept} className="lg:col-span-5 bg-white  p-6 rounded-[24px] border  shadow-sm flex flex-col gap-4">
            <span className="font-bold text-base  flex items-center gap-1.5">
              <Plus className="w-4.5 h-4.5 text-[#15161A]" /> Add Department
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Department Name</label>
              <input 
                type="text" 
                required
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Product, IT support, QA team..." 
                className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Parent Department (Optional Hierarchy)</label>
              <select 
                value={parentDeptId}
                onChange={(e) => setParentDeptId(e.target.value)}
                className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
              >
                <option value="">No Parent (Root department)</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow mt-2"
            >
              Register Department
            </button>
          </form>

          <div className="lg:col-span-7 bg-white  p-6 rounded-[24px] border  shadow-sm flex flex-col gap-4">
            <span className="font-bold text-sm uppercase tracking-wider">Active Departments Directory</span>
            
            {departments.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#5B5E66]">No departments configured yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {departments.map((dept) => {
                  const parent = departments.find(d => d.id === dept.parentDepartmentId);
                  return (
                    <div key={dept.id} className="p-3 rounded-[16px] flex items-center justify-between border border-neutral-200/50">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#15161A]">{dept.name}</span>
                        {parent && (
                          <span className="text-[10px] text-[#5B5E66] font-medium">Sub-dept of: {parent.name}</span>
                        )}
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider">
                        {dept.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Asset Categories */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleAddCategory} className="lg:col-span-5 bg-white  p-6 rounded-[24px] border  shadow-sm flex flex-col gap-4">
            <span className="font-bold text-base  flex items-center gap-1.5">
              <FolderPlus className="w-4.5 h-4.5 text-[#15161A]" /> Configure Category
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Category Name</label>
              <input 
                type="text" 
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Laboratory tools, Machinery..." 
                className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Standard Warranty Period (Months)</label>
              <input 
                type="number" 
                value={catWarranty}
                onChange={(e) => setCatWarranty(Number(e.target.value))}
                placeholder="24" 
                className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
              />
            </div>

            {/* Custom attributes tag list */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[#5B5E66]">Add Property Field</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={catField}
                  onChange={(e) => setCatField(e.target.value)}
                  placeholder="e.g., Processor, Model Year" 
                  className="flex-1 px-4 py-2 rounded-[16px] border bg-white text-xs focus:outline-none"
                />
                <button 
                  type="button" 
                  onClick={handleAddCatField}
                  className="px-4 bg-[#15161A] hover:bg-black text-white rounded-[16px] text-xs font-bold cursor-pointer"
                >
                  Add
                </button>
              </div>

              {catFieldsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {catFieldsList.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 rounded-full bg-[#F4F4F6] text-[9px] font-bold border flex items-center gap-1">
                      {tag} <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => setCatFieldsList(catFieldsList.filter(f => f !== tag))} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow mt-2"
            >
              Add Category
            </button>
          </form>

          <div className="lg:col-span-7 bg-white  p-6 rounded-[24px] border  shadow-sm flex flex-col gap-4">
            <span className="font-bold text-sm uppercase tracking-wider">Asset Categories Directory</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 rounded-[16px] border border-neutral-200/50 flex flex-col gap-2 relative group">
                  <button 
                    onClick={() => deleteCategory(cat.id)}
                    className="absolute right-3 top-3 w-7 h-7 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#15161A]">{cat.name}</span>
                    <span className="text-[9px] text-[#5B5E66] font-bold uppercase tracking-wider mt-0.5">
                      Warranty: {cat.warrantyPeriodMonths || 0} months
                    </span>
                  </div>

                  {cat.customFields && cat.customFields.length > 0 && (
                    <div className="flex flex-wrap gap-1 border-t border-neutral-200/50 pt-2">
                      {cat.customFields.map((field, fIdx) => (
                        <span key={fIdx} className="px-2 py-0.5 rounded-full bg-white text-[8px] font-bold border border-neutral-200/50">
                          {field}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Employee Directory */}
      {activeTab === "directory" && (
        <div className="bg-white  p-6 rounded-[24px] border  shadow-sm flex flex-col gap-4">
          <span className="font-bold text-sm uppercase tracking-wider">Active Members</span>

          {approvedUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#5B5E66]">No approved employees in the directory yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-[#5B5E66] uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Member</th>
                    <th className="pb-3">Verification ID</th>
                    <th className="pb-3">Operational Role</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECECEA]">
                  {approvedUsers.map((user) => {
                    const dept = departments.find(d => d.id === user.departmentId);
                    return (
                      <tr key={user.id} className="hover:bg-[#F4F4F6] transition-colors">
                        <td className="py-3 pl-2 font-bold text-[#15161A]">{user.fullName}</td>
                        <td className="py-3 font-mono text-[#5B5E66]">
                          {user.email || user.phone}
                        </td>
                        <td className="py-3">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                            className="px-2 py-1 border  bg-white  rounded-[8px] text-[11px] font-bold  focus:outline-none cursor-pointer"
                          >
                            <option value="Employee">Employee</option>
                            <option value="Department Head">Department Head</option>
                            <option value="Asset Manager">Asset Manager</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 text-[#5B5E66] font-semibold">{dept?.name || "Unassigned"}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider">
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Pending Requests */}
      {activeTab === "pending" && (
        <div className="bg-white  p-6 rounded-[24px] border  shadow-sm flex flex-col gap-4">
          <span className="font-bold text-sm uppercase tracking-wider">Onboarding Registration Queue</span>

          {pendingApprovalUsers.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#15161A]">
                <Check className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold ">Directory queue is empty</span>
                <p className="text-[11px] text-[#5B5E66]">All requested employee accounts have been finalized and verified.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pendingApprovalUsers.map((user) => (
                <div key={user.id} className="p-4 rounded-[16px] border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#15161A]">{user.fullName}</span>
                    <div className="flex items-center gap-2 text-[10px] text-[#5B5E66] font-medium">
                      <span className="flex items-center gap-0.5">
                        {user.email ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {user.email || user.phone}
                      </span>
                      <span>•</span>
                      <span>Requested: {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Operational selector role and trigger */}
                  <div className="flex items-center gap-2.5">
                    <select 
                      id={`role-select-${user.id}`}
                      defaultValue="Employee"
                      className="px-3 py-1.5 rounded-[8px] border border-neutral-300 bg-white text-xs font-medium text-[#5B5E66]"
                    >
                      <option value="Employee">Employee</option>
                      <option value="Department Head">Department Head</option>
                      <option value="Asset Manager">Asset Manager</option>
                      <option value="Admin">Admin (Promote)</option>
                    </select>

                    <button 
                      onClick={() => {
                        const sel = document.getElementById(`role-select-${user.id}`) as HTMLSelectElement;
                        approveUser(user.id, sel.value as UserRole);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#2FBE6C] hover:opacity-90 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button 
                      onClick={() => rejectUser(user.id)}
                      className="px-3.5 py-1.5 rounded-full border border-red-200 text-red-500 bg-white hover:bg-red-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
