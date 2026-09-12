import React, { useState, useMemo } from "react";
import { useAssetFlow } from "../state";
import { 
  Plus, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  Building,
  Info,
  Sparkles
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

export const BookingView: React.FC = () => {
  const { 
    currentUser, 
    resources, 
    bookings, 
    addResource, 
    bookResource, 
    approveBooking, 
    rejectBooking, 
    users 
  } = useAssetFlow();

  const [selectedResourceId, setSelectedResourceId] = useState("");
  
  // Create resource states
  const [resName, setResName] = useState("");
  const [resType, setResType] = useState<"Room" | "Vehicle" | "Equipment">("Room");
  const [requiresApproval, setRequiresApproval] = useState(false);

  // New Booking picker states
  const [bookStart, setBookStart] = useState("");
  const [bookEnd, setBookEnd] = useState("");

  // AI Scheduling Assistant states
  const [aiBookingPrompt, setAiBookingPrompt] = useState("");
  const [aiBookingLoading, setAiBookingLoading] = useState(false);
  const [aiBookingError, setAiBookingError] = useState<string | null>(null);
  const [aiBookingFeedback, setAiBookingFeedback] = useState<string | null>(null);

  const handleAiBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiBookingPrompt.trim()) return;
    setAiBookingLoading(true);
    setAiBookingError(null);
    setAiBookingFeedback(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: aiBookingPrompt, 
          resources,
          currentTime: new Date().toISOString()
        }),
      });
      if (!response.ok) {
        throw new Error("AI request failed. Please check your backend.");
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update form state if successfully extracted
      if (data.matchedResourceId) {
        setSelectedResourceId(data.matchedResourceId);
      }
      if (data.startTime) {
        setBookStart(data.startTime);
      }
      if (data.endTime) {
        setBookEnd(data.endTime);
      }
      
      setAiBookingFeedback(data.explanation);
    } catch (err: any) {
      setAiBookingError(err.message || "Failed to process natural language request.");
    } finally {
      setAiBookingLoading(false);
    }
  };

  if (!currentUser) return null;

  const role = currentUser.role;
  const isDeptHead = role === "Department Head";
  const isAssetManager = role === "Asset Manager" || role === "Admin";

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim()) return;
    addResource(resName, resType, requiresApproval);
    setResName("");
    setRequiresApproval(false);
  };

  // Real-time overlapping booking check (Section 7 Booking brief)
  const isOverlapDetected = useMemo(() => {
    if (!selectedResourceId || !bookStart || !bookEnd) return false;
    
    const rStart = new Date(bookStart).getTime();
    const rEnd = new Date(bookEnd).getTime();
    
    if (isNaN(rStart) || isNaN(rEnd) || rStart >= rEnd) return false;

    return bookings.some(b => {
      if (b.resourceId !== selectedResourceId || b.status === "Cancelled" || b.status === "Rejected") return false;
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();
      return rStart < bEnd && rEnd > bStart;
    });
  }, [selectedResourceId, bookStart, bookEnd, bookings]);

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId || !bookStart || !bookEnd) {
      alert("Please complete the booking form details.");
      return;
    }

    if (isOverlapDetected) {
      alert("Cannot submit. There is a scheduling conflict over this time slot.");
      return;
    }

    const res = bookResource(selectedResourceId, bookStart, bookEnd);
    alert(res.message);

    // Reset Picker
    setBookStart("");
    setBookEnd("");
  };

  // Scoped bookings list
  const displayBookings = useMemo(() => {
    if (isAssetManager) return bookings;
    if (isDeptHead) {
      // Find approvals for resources that require it and users in same department
      return bookings.filter(b => {
        const resource = resources.find(r => r.id === b.resourceId);
        const maker = users.find(u => u.id === b.userId);
        return resource?.requiresApproval && maker?.departmentId === currentUser.departmentId;
      });
    }
    // Employee: their own bookings
    return bookings.filter(b => b.userId === currentUser.id);
  }, [bookings, isAssetManager, isDeptHead, resources, users, currentUser]);

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case "Confirmed": 
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
      case "Pending Approval": 
        return "bg-amber-50 text-amber-700 border border-amber-200/60";
      case "Rejected": 
        return "bg-rose-50 text-rose-700 border border-rose-200/60";
      default: 
        return "bg-[#F4F4F6] text-[#5B5E66] border border-neutral-200/50";
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left py-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-widest">Shared Calendars</span>
        <h2 className="text-2xl font-extrabold ">Resource Booking</h2>
        <p className="text-xs text-[#15161A]">Reserve shared conference rooms, company utility cars, or specialized developer kits.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Create Resource or Reserve Slot */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* AI Scheduling Assistant Form */}
          <form onSubmit={handleAiBookingSubmit} className="bg-gradient-to-br from-[#FF4D8D]/5 to-[#FFA35C]/5 p-6 rounded-[16px] border border-[#ECECEA] shadow-lg flex flex-col gap-4">
            <span className="font-extrabold text-sm  flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-[#15161A]" /> AI Booking Assistant (Gemini)
            </span>

            <p className="text-[11px] text-[#5B5E66] leading-relaxed font-medium">
              Schedule any corporate resource using normal text (e.g., "Reserve Conference Room A tomorrow from 1 to 2:30 PM"). Gemini will resolve relative dates, auto-select the item, and pre-fill the form for you.
            </p>

            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <input 
                  type="text" 
                  value={aiBookingPrompt}
                  onChange={(e) => setAiBookingPrompt(e.target.value)}
                  placeholder="e.g. Reserve Boardroom tomorrow from 2pm to 3:30pm"
                  className="w-full px-4 py-2.5 rounded-[16px] border  bg-white  text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4D8D] pr-10"
                />
                <button 
                  type="submit" 
                  disabled={aiBookingLoading || !aiBookingPrompt.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FF4D8D] hover:text-[#FFA35C] disabled:text-[#5B5E66] font-extrabold text-xs cursor-pointer"
                >
                  {aiBookingLoading ? "..." : "Draft"}
                </button>
              </div>
            </div>

            {aiBookingError && (
              <div className="p-3 bg-[#FFE9E9]  text-[#FF4D4F]  text-[11px] rounded-[16px] border border-rose-100  font-semibold">
                {aiBookingError}
              </div>
            )}

            {aiBookingFeedback && (
              <div className="p-4 bg-[#FFFFFF]  rounded-[16px] border  flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">AI Advisor Feedback</span>
                <p className="text-[11px] text-[#5B5E66]  leading-relaxed font-semibold">
                  {aiBookingFeedback}
                </p>
              </div>
            )}
          </form>
          
          {/* Admin / AM Register Shared Resource Form */}
          {isAssetManager && (
            <form onSubmit={handleCreateResource} className="bg-[#FFFFFF]   p-6 rounded-[16px] border  shadow-sm flex flex-col gap-4">
              <span className="font-bold text-base  flex items-center gap-1.5">
                <Plus className="w-4.5 h-4.5 text-[#15161A]" /> Add Shareable Resource
              </span>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">Resource Name</label>
                <input 
                  type="text" required value={resName} onChange={(e) => setResName(e.target.value)}
                  placeholder="e.g., Conference Room A, Tesla Model 3"
                  className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#5B5E66]">Resource Type</label>
                  <select 
                    value={resType} onChange={(e) => setResType(e.target.value as any)}
                    className="px-3.5 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                  >
                    <option value="Room">Meeting Room</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Equipment">Specialist Gear</option>
                  </select>
                </div>

                {/* Approvals requirement switch togglable per resource (Section 7 Booking brief) */}
                <div className="flex flex-col gap-1 justify-center pl-2">
                  <span className="text-xs font-semibold text-[#5B5E66]">Approvals Gate</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer mt-2">
                    <input 
                      type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)}
                      className="rounded border-neutral-300 focus:ring-[#FF4D8D]"
                    />
                    <span className="text-[11px] text-[#5B5E66] font-bold uppercase">Requires DH sign</span>
                  </label>
                </div>
              </div>

              <button 
                type="submit"
                className="px-4 py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-90 shadow-sm"
              >
                Register Resource
              </button>
            </form>
          )}

          {/* Booking Request Slot Form */}
          <form onSubmit={handleBookSubmit} className="bg-[#FFFFFF]   p-6 rounded-[16px] border  shadow-sm flex flex-col gap-4">
            <span className="font-bold text-base  flex items-center gap-1.5">
              <Calendar className="w-4.5 h-4.5 text-[#15161A]" /> Schedule Reservation
            </span>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#5B5E66]">Select Resource</label>
              <select 
                required value={selectedResourceId} onChange={(e) => setSelectedResourceId(e.target.value)}
                className="px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
              >
                <option value="">Choose item...</option>
                {resources.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type}) {r.requiresApproval ? "★ Approval gate active" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">Start Time</label>
                <input 
                  type="datetime-local" required value={bookStart} onChange={(e) => setBookStart(e.target.value)}
                  className="px-3.5 py-2 rounded-[16px] border bg-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">End Time</label>
                <input 
                  type="datetime-local" required value={bookEnd} onChange={(e) => setBookEnd(e.target.value)}
                  className="px-3.5 py-2 rounded-[16px] border bg-white text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Overlap Warning Box (Section 7 Booking brief) */}
            {isOverlapDetected && (
              <div className="p-4 border rounded-[16px] flex items-start gap-2.5 animate-pulse">
                <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                <div className="text-xs flex flex-col gap-0.5 text-left">
                  <span className="font-bold">Collision Warning!</span>
                  <p className="font-medium text-[11px] leading-relaxed">
                    This time block overlaps with an existing reservation. Please shift your hours to prevent double-booking.
                  </p>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isOverlapDetected || !selectedResourceId || !bookStart || !bookEnd}
              className="w-full py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow"
            >
              Confirm Reservation Slot
            </button>
          </form>

        </div>

        {/* Right Column: Visual timeline / Active Bookings list */}
        <div className="lg:col-span-7 bg-[#FFFFFF]   p-6 rounded-[16px] border  shadow-sm flex flex-col gap-4">
          <span className="font-bold text-sm uppercase tracking-wider">Reservation Board</span>
          
          {displayBookings.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3 border border-dashed rounded-[16px]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#15161A]">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#15161A]">No reservations scheduled</span>
                <p className="text-[10px] text-[#5B5E66]">All shared resources are currently open and unoccupied.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayBookings.map((b) => {
                const res = resources.find(r => r.id === b.resourceId);
                const booker = users.find(u => u.id === b.userId);
                
                return (
                  <div key={b.id} className="p-4 rounded-[16px] border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#15161A]">{res?.name || "Shared Item"}</span>
                      <span className="text-[10px] text-[#5B5E66] font-semibold">
                        Scheduled by: {booker?.fullName || "Employee"} • ({booker?.role})
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-semibold mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(b.start).toLocaleString()} → {new Date(b.end).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${getBookingStatusBadge(b.status)}`}>
                        {b.status}
                      </span>

                      {/* Approval buttons for Department Heads and Admins */}
                      {b.status === "Pending Approval" && (isDeptHead || isAssetManager) && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => approveBooking(b.id)}
                            className="w-7 h-7 rounded-full bg-white border flex items-center justify-center hover:cursor-pointer"
                            title="Approve"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => rejectBooking(b.id)}
                            className="w-7 h-7 rounded-full bg-white border flex items-center justify-center text-red-500 hover:cursor-pointer"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
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
