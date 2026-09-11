import React, { useState, useMemo } from "react";
import { useAssetFlow } from "../state";
import { AuditCycle, Asset } from "../types";
import { 
  ClipboardCheck, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Check, 
  X,
  XCircle,
  ShieldCheck,
  Info
} from "lucide-react";

export const AuditView: React.FC = () => {
  const { 
    currentUser, 
    audits, 
    assets, 
    users, 
    startAudit, 
    verifyAuditItem, 
    closeAudit 
  } = useAssetFlow();

  const [auditScope, setAuditScope] = useState("");
  const [selectedAuditorId, setSelectedAuditorId] = useState("");
  const [auditCreateOpen, setAuditCreateOpen] = useState(false);

  if (!currentUser) return null;

  const role = currentUser.role;
  const isDeptHead = role === "Department Head";
  const isManager = role === "Asset Manager" || role === "Admin";

  const handleStartAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditScope.trim() || !selectedAuditorId) {
      alert("Please provide the scope and assign an auditor.");
      return;
    }

    // Include all current assets in scope for simulation ease
    const assetTags = assets.map(a => a.tag);
    if (assetTags.length === 0) {
      alert("No assets in inventory to audit! Register some assets first.");
      return;
    }

    startAudit(auditScope, [selectedAuditorId], assetTags);
    alert("Audit cycle initiated successfully.");
    setAuditScope("");
    setSelectedAuditorId("");
    setAuditCreateOpen(false);
  };

  const activeAudit = useMemo(() => {
    return audits.find(a => a.status === "Active") || null;
  }, [audits]);

  // Count discrepancy issues inside active audit
  const discrepanciesCount = useMemo(() => {
    if (!activeAudit) return 0;
    return Object.values(activeAudit.items).filter(status => status === "Missing" || status === "Damaged").length;
  }, [activeAudit]);

  const getVerificationIcon = (status: string) => {
    switch (status) {
      case "Verified": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "Missing": return <XCircle className="w-4 h-4 text-rose-500" />;
      case "Damaged": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left py-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-widest">Compliance & Audits</span>
        <h2 className="text-2xl font-extrabold ">Audit Cycles</h2>
        <p className="text-xs text-[#15161A]">Launch recurring physical audits, verify serial markers, and log discrepancies.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Active audit controller or Creation form */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Audit initiator form (Only managers, read-only for DH) */}
          {isManager && !activeAudit && (
            <form onSubmit={handleStartAudit} className="bg-white  p-6 rounded-[16px] border  shadow-sm flex flex-col gap-4">
              <span className="font-bold text-base  flex items-center gap-1.5">
                <Plus className="w-4.5 h-4.5 text-[#15161A]" /> Start Audit Cycle
              </span>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">Audit Target Scope</label>
                <input 
                  type="text" required value={auditScope} onChange={(e) => setAuditScope(e.target.value)}
                  placeholder="e.g., IT Hardware, Head Office"
                  className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">Lead Auditor</label>
                <select 
                  required value={selectedAuditorId} onChange={(e) => setSelectedAuditorId(e.target.value)}
                  className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                >
                  <option value="">Choose user...</option>
                  {users.filter(u => u.status === "approved").map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow-md mt-1"
              >
                Launch Verification Cycle
              </button>
            </form>
          )}

          {activeAudit && (
            <div className="bg-gradient-to-br from-[#FF4D8D] to-[#FFA35C] text-white p-7 rounded-[24px] shadow-xl flex flex-col gap-6 text-left relative overflow-hidden">
              <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-[#FFFFFF] opacity-20 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-extrabold tracking-widest flex items-center gap-1.5 text-white/90">
                  <Clock className="w-3.5 h-3.5" /> Active Verification Cycle
                </span>
                <span className="text-xl font-extrabold tracking-tight leading-snug">{activeAudit.scope}</span>
                <p className="text-[11px] text-white/80 font-medium">Target Range: {activeAudit.startDate} to {activeAudit.endDate}</p>
              </div>

              {/* Live discrepancy count banner (Section 7 Audit brief) */}
              <div className="p-4 bg-white rounded-[16px] text-xs flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-[#15161A]" />
                  <span className="font-bold text-[#15161A]">Discrepancies Flagged</span>
                </div>
                <span className="font-extrabold text-xs text-[#15161A] bg-neutral-100 px-2.5 py-1 rounded-full">{discrepanciesCount}</span>
              </div>

              {isManager ? (
                <button 
                  onClick={() => {
                    closeAudit(activeAudit.id);
                    alert("Audit locked successfully! Any missing items are now flagged as 'Lost' in the active directory.");
                  }}
                  className="w-full py-3 rounded-full bg-white hover:bg-neutral-50 text-[#15161A] text-xs font-bold cursor-pointer shadow-md text-center transition-all active:scale-95 duration-100"
                >
                  Close Audit Cycle
                </button>
              ) : (
                <div className="w-full py-3 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-white text-center flex items-center justify-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5" /> Overseeing read-only cycle.
                </div>
              )}
            </div>
          )}

          {!activeAudit && isDeptHead && (
            <div className="bg-white  p-6 rounded-[16px] border  shadow-sm text-center py-12 flex flex-col items-center gap-2 text-xs">
              <ClipboardCheck className="w-8 h-8 text-[#5B5E66]" />
              <span className="font-bold">No active audit cycles</span>
              <p className="text-[#5B5E66]">As a Department Head, you will oversee results once the Admin launches a cycle.</p>
            </div>
          )}
        </div>

        {/* Right Column: Active audit assets checklist (Read-only check for DH) */}
        <div className="lg:col-span-8 bg-white  p-6 rounded-[16px] border  shadow-sm flex flex-col gap-4">
          <span className="font-bold text-sm uppercase tracking-wider">Asset Scope Checklist</span>

          {!activeAudit ? (
            <div className="py-12 text-center text-xs text-[#5B5E66]">
              No audit cycle currently active. Launch a cycle to configure checklist results.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(activeAudit.items).map(([tag, statusVal]) => {
                const status = statusVal as "Verified" | "Missing" | "Damaged";
                const asset = assets.find(a => a.tag === tag);
                return (
                  <div key={tag} className="p-4 rounded-[16px] border border-neutral-100/70 bg-neutral-50/30 hover:bg-neutral-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold font-mono text-neutral-400">#{tag}</span>
                        <span className="text-xs font-bold text-[#15161A]">{asset?.name || "Equipment"}</span>
                      </div>
                      <span className="text-[10px] text-[#5B5E66] font-semibold mt-0.5">Location: {asset?.location || "Storage"}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Active Status Display icon */}
                      <span className={`flex items-center gap-1.5 text-[11px] font-extrabold ${
                        status === "Verified" 
                          ? "text-emerald-600" 
                          : status === "Damaged" 
                            ? "text-amber-600" 
                            : "text-rose-600"
                      }`}>
                        {getVerificationIcon(status)}
                        {status}
                      </span>

                      {/* Modify buttons for Auditors (Manager), disabled for DH (Section 7 Audit brief) */}
                      {isManager && (
                        <div className="flex p-0.5 bg-white rounded-[16px] border border-neutral-100">
                          <button 
                            onClick={() => verifyAuditItem(activeAudit.id, tag, "Verified")}
                            className={`px-2.5 py-1 rounded-[12px] text-[9px] font-bold cursor-pointer uppercase transition-all ${status === "Verified" ? "bg-emerald-100 text-emerald-800" : "text-[#5B5E66] hover:bg-neutral-50"}`}
                          >
                            Verified
                          </button>
                          <button 
                            onClick={() => verifyAuditItem(activeAudit.id, tag, "Damaged")}
                            className={`px-2.5 py-1 rounded-[12px] text-[9px] font-bold cursor-pointer uppercase transition-all ${status === "Damaged" ? "bg-amber-100 text-amber-800" : "text-[#5B5E66] hover:bg-neutral-50"}`}
                          >
                            Damaged
                          </button>
                          <button 
                            onClick={() => verifyAuditItem(activeAudit.id, tag, "Missing")}
                            className={`px-2.5 py-1 rounded-[12px] text-[9px] font-bold cursor-pointer uppercase transition-all ${status === "Missing" ? "bg-rose-100 text-rose-800" : "text-[#5B5E66] hover:bg-neutral-50"}`}
                          >
                            Missing
                          </button>
                        </div>
                      )}
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
