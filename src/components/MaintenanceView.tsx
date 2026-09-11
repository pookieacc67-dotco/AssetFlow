import React, { useState, useMemo } from "react";
import { useAssetFlow } from "../state";
import { MaintenanceRequest } from "../types";
import { 
  Plus, 
  Wrench, 
  Check, 
  Clock, 
  AlertTriangle, 
  User, 
  ChevronRight, 
  ChevronLeft,
  Info
} from "lucide-react";

export const MaintenanceView: React.FC = () => {
  const { 
    currentUser, 
    maintenance, 
    assets, 
    raiseMaintenance, 
    updateMaintenanceStatus 
  } = useAssetFlow();

  const [selectedAssetTag, setSelectedAssetTag] = useState("");
  const [description, setDescription] = useState("");
  const [techName, setTechName] = useState("");

  if (!currentUser) return null;

  const role = currentUser.role;
  const isEmployee = role === "Employee";
  const isAssetManager = role === "Asset Manager" || role === "Admin" || role === "Department Head";

  const handleRaiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetTag || !description.trim()) {
      alert("Please fill out repair details.");
      return;
    }

    raiseMaintenance(selectedAssetTag, description);
    alert("Damage report submitted. Asset is now flagged as 'Under Maintenance'.");
    setSelectedAssetTag("");
    setDescription("");
  };

  // Scoped lists
  const displayRequests = useMemo(() => {
    if (!isEmployee) return maintenance;
    return maintenance.filter(m => m.userId === currentUser.id);
  }, [maintenance, isEmployee, currentUser]);

  // Kanban column segments
  const columns: { id: MaintenanceRequest["status"]; label: string; bg: string }[] = [
    { id: "Pending", label: "Pending Review", bg: "border-t-rose-400" },
    { id: "Approved", label: "Approved Work", bg: "border-t-blue-400" },
    { id: "Technician Assigned", label: "Tech Assigned", bg: "border-t-indigo-400" },
    { id: "In Progress", label: "In Repair", bg: "border-t-amber-400" },
    { id: "Resolved", label: "Resolved", bg: "border-t-emerald-400" }
  ];

  const handleMoveCard = (id: string, currentStatus: MaintenanceRequest["status"], direction: "left" | "right") => {
    const statuses: MaintenanceRequest["status"][] = ["Pending", "Approved", "Technician Assigned", "In Progress", "Resolved"];
    const idx = statuses.indexOf(currentStatus);
    
    let nextIdx = direction === "right" ? idx + 1 : idx - 1;
    if (nextIdx >= 0 && nextIdx < statuses.length) {
      updateMaintenanceStatus(id, statuses[nextIdx]);
    }
  };

  const handleAssignTechSubmit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!techName.trim()) return;
    updateMaintenanceStatus(id, "Technician Assigned", techName);
    setTechName("");
  };

  return (
    <div className="flex flex-col gap-6 text-left py-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-widest">Reliability & Operations</span>
        <h2 className="text-2xl font-extrabold ">Maintenance Board</h2>
        <p className="text-xs text-[#15161A]">File hardware damage reports, route technician tickets, and track repair lifecycles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Raise Ticket */}
        <div className="lg:col-span-4 bg-[#FFFFFF]   p-6 rounded-[16px] border  shadow-sm flex flex-col gap-4">
          <span className="font-bold text-base  flex items-center gap-1.5">
            <Wrench className="w-4.5 h-4.5 text-[#15161A]" /> Raise Repair Ticket
          </span>

          <form onSubmit={handleRaiseSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Select Asset</label>
              <select 
                required value={selectedAssetTag} onChange={(e) => setSelectedAssetTag(e.target.value)}
                className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
              >
                <option value="">Choose asset...</option>
                {assets.map(a => (
                  <option key={a.tag} value={a.tag}>
                    {a.tag} — {a.name} ({a.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Describe the Damage / Issue</label>
              <textarea 
                required value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe screen flickering, loose hinges, brake fluid issues..."
                className="px-4 py-2 rounded-[16px] border bg-white text-xs focus:outline-none h-24 resize-none"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow-md"
            >
              Raise Repair Request
            </button>
          </form>
        </div>

        {/* Right Column: Board (or List if Employee) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {isEmployee ? (
            /* Simplified personal list for Employee */
            <div className="bg-[#FFFFFF]   p-6 rounded-[16px] border  shadow-sm flex flex-col gap-4">
              <span className="font-bold text-sm uppercase tracking-wider">My Maintenance Tickets</span>
              
              {displayRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#5B5E66]">
                  You have not raised any hardware repair requests.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayRequests.map((req) => (
                    <div key={req.id} className="p-4 rounded-[16px] flex items-center justify-between border border-neutral-200">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-extrabold font-mono">{req.assetTag}</span>
                        <p className="text-[11px] text-[#5B5E66] mt-1">"{req.description}"</p>
                        <span className="text-[9px] text-[#5B5E66] mt-0.5">Raised on: {req.createdAt.split("T")[0]}</span>
                      </div>
                      
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider border ${
                        req.status === "Resolved"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : req.status === "Pending"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Kanban Board for Managers */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {columns.map((col) => {
                const colRequests = displayRequests.filter(m => m.status === col.id);
                return (
                  <div 
                    key={col.id} 
                    className={`flex flex-col gap-3 p-3 bg-[#FFFFFF]   rounded-[16px] border  shadow-xs border-t-4 ${col.bg} min-h-[350px]`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold  uppercase tracking-wider">{col.label}</span>
                      <span className="w-5 h-5 rounded-full  text-[10px] font-extrabold text-[#5B5E66] flex items-center justify-center">
                        {colRequests.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 overflow-y-auto">
                      {colRequests.map((req) => (
                        <div key={req.id} className="p-3  rounded-[16px] border border-neutral-200/50 flex flex-col gap-2 text-left relative group">
                          
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-[#15161A]">{req.assetTag}</span>
                            
                            {/* Directional Move triggers */}
                            <div className="flex gap-0.5">
                              {col.id !== "Pending" && (
                                <button 
                                  onClick={() => handleMoveCard(req.id, req.status, "left")}
                                  className="w-5 h-5 bg-white rounded-full flex items-center justify-center cursor-pointer border hover:bg-[#F4F4F6] text-[#5B5E66]"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {col.id !== "Resolved" && (
                                <button 
                                  onClick={() => handleMoveCard(req.id, req.status, "right")}
                                  className="w-5 h-5 bg-white rounded-full flex items-center justify-center cursor-pointer border hover:bg-[#F4F4F6] text-[#5B5E66]"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-[10px] text-[#5B5E66]  leading-tight font-medium">
                            "{req.description}"
                          </p>

                          {/* Tech assign picker inside card */}
                          {req.status === "Approved" && (
                            <form 
                              onSubmit={(e) => handleAssignTechSubmit(req.id, e)}
                              className="mt-1 border-t border-dashed border-neutral-300 pt-2 flex flex-col gap-1"
                            >
                              <span className="text-[9px] font-bold text-[#5B5E66]">Assign Tech</span>
                              <div className="flex gap-1">
                                <input 
                                  type="text" required placeholder="Name..." value={techName} onChange={(e) => setTechName(e.target.value)}
                                  className="flex-1 px-2 py-1 border rounded-[16px] bg-white text-[9px] focus:outline-none"
                                />
                                <button type="submit" className="px-2 bg-[#15161A] hover:bg-black text-white rounded-[16px] text-[9px] font-bold">Ok</button>
                              </div>
                            </form>
                          )}

                          {req.assignedTech && (
                            <div className="text-[9px] text-[#5B5E66] flex items-center gap-1 font-semibold mt-1">
                              <User className="w-3.5 h-3.5 text-[#5B5E66]" /> Tech: {req.assignedTech}
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
