import React, { useState, useMemo } from "react";
import { useAssetFlow } from "../state";
import { 
  Plus, 
  UserCheck, 
  ArrowLeftRight, 
  Check, 
  X, 
  AlertCircle, 
  Layers, 
  Calendar,
  Sparkles,
  Info
} from "lucide-react";

export const AllocationView: React.FC = () => {
  const { 
    currentUser, 
    assets, 
    users, 
    allocations, 
    transfers, 
    allocateAsset, 
    returnAsset, 
    requestTransfer, 
    approveTransfer, 
    rejectTransfer 
  } = useAssetFlow();

  const [selectedAssetTag, setSelectedAssetTag] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // default 14 days
  );

  // Form transfer states
  const [transferTargetUserId, setTransferTargetUserId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  if (!currentUser) return null;

  const role = currentUser.role;
  const isEmployee = role === "Employee";
  const isAssetManager = role === "Asset Manager" || role === "Admin";
  const isDeptHead = role === "Department Head";

  // Check if selected asset is currently allocated
  const selectedAsset = assets.find(a => a.tag === selectedAssetTag);
  const isAlreadyAllocated = selectedAsset?.status === "Allocated";
  
  // Find who holds the selected asset
  const activeAllocation = useMemo(() => {
    if (!selectedAssetTag) return null;
    return allocations.find(al => al.assetTag === selectedAssetTag && al.status === "Active") || null;
  }, [selectedAssetTag, allocations]);

  const currentHolder = useMemo(() => {
    if (!activeAllocation) return null;
    return users.find(u => u.id === activeAllocation.userId) || null;
  }, [activeAllocation, users]);

  const handleAllocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetTag || !selectedAssigneeId || !expectedReturnDate) {
      alert("Please fill out all allocation details.");
      return;
    }

    const res = allocateAsset(selectedAssetTag, selectedAssigneeId, expectedReturnDate);
    if (res.success) {
      setSelectedAssetTag("");
      setSelectedAssigneeId("");
    } else {
      alert(res.message);
    }
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetTag || !transferTargetUserId || !transferReason.trim()) {
      alert("All fields are required to route a transfer request.");
      return;
    }

    const res = requestTransfer(selectedAssetTag, transferTargetUserId, transferReason);
    alert(res.message);
    
    // Clear Form
    setTransferTargetUserId("");
    setTransferReason("");
    setSelectedAssetTag("");
  };

  // Lists filtered for current organizational users
  const assignableUsers = users.filter(u => u.status === "approved" && u.id !== currentUser.id);

  // Scoped transfers requests (Section 6 table)
  const scopedTransfers = useMemo(() => {
    if (isDeptHead) {
      // Find transfer requests where target user is in their department
      return transfers.filter(t => {
        const target = users.find(u => u.id === t.toUserId);
        return target?.departmentId === currentUser.departmentId && t.status === "Pending";
      });
    }
    if (isAssetManager) {
      return transfers;
    }
    // Employee: raised by them
    return transfers.filter(t => t.fromUserId === currentUser.id);
  }, [transfers, isDeptHead, isAssetManager, users, currentUser]);

  return (
    <div className="flex flex-col gap-6 text-left py-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-widest">Ownership & Transfers</span>
        <h2 className="text-2xl font-extrabold ">Allocations Manager</h2>
        <p className="text-xs text-[#15161A]">Assign physical hardware, return equipment, or initiate department-wide transfers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Register allocation/transfer form */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="bg-[#FFFFFF]   p-6 rounded-[16px] border  shadow-sm flex flex-col gap-4">
            <span className="font-bold text-base  flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-[#15161A]" /> Select Asset Tag
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Inventory Item</label>
              <select 
                value={selectedAssetTag}
                onChange={(e) => setSelectedAssetTag(e.target.value)}
                className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
              >
                <option value="">Choose Asset...</option>
                {assets.map(a => (
                  <option key={a.tag} value={a.tag}>
                    {a.tag} — {a.name} ({a.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Core Conflict Handling alert (Section 7 Allocations brief) */}
            {isAlreadyAllocated && (
              <div className="p-4 border rounded-[16px] flex flex-col gap-3">
                <div className="flex items-start gap-2.5 text-[#15161A]">
                  <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                  <div className="text-xs flex flex-col gap-0.5 text-left">
                    <span className="font-bold">Conflict: Item Already Held</span>
                    <p className="font-medium text-[11px] leading-relaxed">
                      {selectedAsset?.name} is currently allocated to <strong>{currentHolder?.fullName}</strong>. You cannot assign it directly.
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold">Want to request ownership transfer?</span>
                  <button 
                    type="button"
                    onClick={() => {
                      // Switch focus to transfer target
                      setTransferTargetUserId(currentUser.id); // Transfer to self
                    }}
                    className="px-3 py-1 rounded-full bg-[#15161A] hover:bg-black text-white text-[10px] font-bold hover:cursor-pointer shadow-sm"
                  >
                    Set Transfer Target
                  </button>
                </div>
              </div>
            )}

            {/* Condition Render form based on Conflict and user role */}
            {selectedAsset && !isAlreadyAllocated && isAssetManager && (
              <form onSubmit={handleAllocateSubmit} className="flex flex-col gap-4 border-t border-neutral-100 pt-4 mt-2">
                <span className="text-xs font-bold uppercase tracking-wider">Configure Allocation Form</span>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#5B5E66]">Assignee</label>
                  <select 
                    required
                    value={selectedAssigneeId}
                    onChange={(e) => setSelectedAssigneeId(e.target.value)}
                    className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                  >
                    <option value="">Select teammate...</option>
                    {users.filter(u => u.status === "approved").map(u => (
                      <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#5B5E66]">Expected Return Deadline</label>
                  <input 
                    type="date"
                    required
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow-md mt-1"
                >
                  Confirm Allocation
                </button>
              </form>
            )}

            {/* Direct return action button if asset allocated */}
            {selectedAsset && isAlreadyAllocated && isAssetManager && (
              <div className="border-t border-neutral-100 pt-4 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">Quick Actions</span>
                <button 
                  onClick={() => {
                    returnAsset(selectedAssetTag);
                    setSelectedAssetTag("");
                  }}
                  className="w-full py-2.5 rounded-full border border-neutral-300 hover:text-[#5B5E66] text-xs font-bold cursor-pointer transition-colors"
                >
                  Return to Inventory (Check-in)
                </button>
              </div>
            )}

            {/* Transfer form for Employee / Conflict case */}
            {selectedAsset && isAlreadyAllocated && (
              <form onSubmit={handleTransferSubmit} className="flex flex-col gap-4 border-t border-neutral-100 pt-4 mt-1">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-[#15161A]" /> Submit Transfer Request
                </span>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#5B5E66]">Transfer Ownership To</label>
                  <select 
                    required
                    value={transferTargetUserId}
                    onChange={(e) => setTransferTargetUserId(e.target.value)}
                    className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                  >
                    <option value="">Choose new owner...</option>
                    {users.filter(u => u.status === "approved").map(u => (
                      <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#5B5E66]">Reason for Ownership Transfer</label>
                  <textarea 
                    required
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="Describe task change or department handover..."
                    className="px-4 py-2 rounded-[16px] border bg-white text-xs focus:outline-none h-16 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow"
                >
                  Route Transfer Request
                </button>
              </form>
            )}

            {!selectedAsset && (
              <div className="py-6 text-center text-xs text-[#5B5E66]">
                Please select an asset to configure its allocation or request ownership handover.
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Active Transfers queue & historical records */}
        <div className="lg:col-span-6 bg-[#FFFFFF]   p-6 rounded-[16px] border  shadow-sm flex flex-col gap-4">
          <span className="font-bold text-sm uppercase tracking-wider">Pending Transfer Queue</span>
          
          {scopedTransfers.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3 border border-dashed rounded-[16px]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#15161A]">
                <Check className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#15161A]">Transfer queue is clean</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {scopedTransfers.map((item) => {
                const fromUser = users.find(u => u.id === item.fromUserId);
                const toUser = users.find(u => u.id === item.toUserId);
                return (
                  <div key={item.id} className="p-4 rounded-[16px] border border-neutral-200 flex flex-col gap-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold font-mono">{item.assetTag}</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                        item.status === "Approved" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" 
                          : item.status === "Rejected" 
                            ? "bg-rose-50 text-rose-700 border border-rose-200/60" 
                            : "bg-amber-50 text-amber-700 border border-amber-200/60"
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#5B5E66] font-medium leading-relaxed">
                      Handover: <strong>{fromUser?.fullName}</strong> → <strong>{toUser?.fullName}</strong>.
                    </p>
                    
                    <div className="bg-white p-2.5 rounded-[16px] border text-[10px] text-[#5B5E66] font-medium">
                      Reason: "{item.reason}"
                    </div>

                    {/* Operational Approvals for Department Heads & Asset Managers */}
                    {item.status === "Pending" && (isDeptHead || isAssetManager) && (
                      <div className="flex gap-2 self-end mt-1">
                        <button 
                          onClick={() => approveTransfer(item.id)}
                          className="px-3.5 py-1 rounded-full bg-[#2FBE6C] hover:opacity-90 text-white text-[10px] font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button 
                          onClick={() => rejectTransfer(item.id)}
                          className="px-3.5 py-1 rounded-full border border-red-200 text-red-500 bg-white hover:bg-red-50 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    )}
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
