import React, { useMemo, useState } from "react";
import { useAssetFlow } from "../state";
import { LineChart } from "./Charts";
import { 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Plus, 
  Check, 
  Clock, 
  ChevronRight,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface DashboardProps {
  onNavigateSection: (sec: string) => void;
  searchQuery: string;
}

export const DashboardView: React.FC<DashboardProps> = ({ onNavigateSection, searchQuery }) => {
  const { 
    currentUser, 
    assets, 
    allocations,
    bookings, 
    transfers, 
    maintenance, 
    users, 
    activityLogs,
    currentOrg
  } = useAssetFlow();

  const [showAIResult, setShowAIResult] = useState(false);

  if (!currentUser) return null;

  const role = currentUser.role;
  const isOrgScoped = role === "Admin" || role === "Asset Manager";
  const isDeptScoped = role === "Department Head";

  const scopedAssets = useMemo(() => {
    if (isOrgScoped) return assets;
    if (isDeptScoped) return assets; // fallback
    return assets;
  }, [assets, users, role, isOrgScoped, isDeptScoped, currentUser]);

  const activeAllocations = useMemo(() => {
    return scopedAssets.filter(a => a.status === "Allocated").length;
  }, [scopedAssets]);

  const pendingApprovalsCount = useMemo(() => {
    const pendingTransfers = transfers.filter(t => t.status === "Pending").length;
    const pendingBookings = bookings.filter(b => b.status === "Pending Approval").length;
    const pendingMaint = maintenance.filter(m => m.status === "Pending").length;
    
    if (role === "Admin") {
      const pendingUsers = users.filter(u => u.status === "pending_approval").length;
      return pendingTransfers + pendingBookings + pendingMaint + pendingUsers;
    }
    if (role === "Department Head") {
      return pendingTransfers + pendingBookings;
    }
    return 0;
  }, [transfers, bookings, maintenance, users, role]);

  const upcomingReturnsCount = useMemo(() => {
    return activeAllocations > 0 ? Math.min(activeAllocations, 3) : 0;
  }, [activeAllocations]);

  const utilizationPercentage = useMemo(() => {
    if (assets.length === 0) return 0;
    const activeCount = assets.filter(a => a.status === "Allocated" || a.status === "Under Maintenance").length;
    return Math.round((activeCount / assets.length) * 100);
  }, [assets]);

  const displayLogs = useMemo(() => {
    return activityLogs.slice(0, 5);
  }, [activityLogs]);

  const last7DaysChartData = useMemo(() => {
    const days = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateString = d.toISOString().split("T")[0];
      const dayLabel = weekdays[d.getDay()];

      if (assets.length === 0) {
        days.push({ label: dayLabel, value: 0 });
        continue;
      }

      let activeOnDay = 0;
      assets.forEach((asset) => {
        const hasAllocation = allocations.some((alloc) => {
          if (alloc.assetTag !== asset.tag) return false;
          const assigned = alloc.assignedDate.split("T")[0];
          const returned = alloc.actualReturnDate ? alloc.actualReturnDate.split("T")[0] : null;
          
          if (assigned <= dateString) {
            if (!returned || returned >= dateString) {
              return true;
            }
          }
          return false;
        });

        const hasMaintenance = maintenance.some((maint) => {
          if (maint.assetTag !== asset.tag) return false;
          const created = maint.createdAt.split("T")[0];
          if (created <= dateString) {
            if (maint.status !== "Resolved") {
              return true;
            }
          }
          return false;
        });

        if (hasAllocation || hasMaintenance) {
          activeOnDay++;
        }
      });

      const percentage = Math.round((activeOnDay / assets.length) * 100);
      days.push({ label: dayLabel, value: percentage });
    }
    return days;
  }, [assets, allocations, maintenance]);

  const hasNoData = assets.length === 0;

  return (
    <div className="flex flex-col gap-[20px] py-[8px]">
      
      {/* Top operational row - Mini Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
        <div className="glass-card glass-card-hover rounded-[24px] p-[16px] flex items-center justify-between">
          <div className="flex flex-col text-left gap-[4px]">
            <span className="text-[10.5px] font-bold leading-[14px] tracking-[0.3px] uppercase text-[#9A9DA4]">Assets Available</span>
            <span className="text-[20px] font-extrabold leading-[22px] tracking-[-0.2px] text-[#15161A]">
              {assets.filter(a => a.status === "Available").length}
            </span>
          </div>
          <button 
            onClick={() => onNavigateSection("assets")}
            className="w-[36px] h-[36px] rounded-full bg-white hover:bg-[#15161A] hover:text-white text-[#15161A] flex items-center justify-center shadow-sm cursor-pointer"
          >
            <ChevronRight className="w-[16px] h-[16px]" />
          </button>
        </div>

        <div className="glass-card glass-card-hover rounded-[24px] p-[16px] flex items-center justify-between">
          <div className="flex flex-col text-left gap-[4px]">
            <span className="text-[10.5px] font-bold leading-[14px] tracking-[0.3px] uppercase text-[#9A9DA4]">Pending Approvals</span>
            <span className="text-[20px] font-extrabold leading-[22px] tracking-[-0.2px] text-[#15161A]">
              {pendingApprovalsCount}
            </span>
          </div>
          <button 
            onClick={() => {
              if (role === "Admin") onNavigateSection("setup");
              else onNavigateSection("allocation");
            }}
            disabled={pendingApprovalsCount === 0}
            className="w-[36px] h-[36px] rounded-full bg-white hover:bg-[#15161A] hover:text-white text-[#15161A] flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50"
          >
            <ChevronRight className="w-[16px] h-[16px]" />
          </button>
        </div>

        <div className="glass-card glass-card-hover rounded-[24px] p-[16px] flex items-center justify-between">
          <div className="flex flex-col text-left gap-[4px]">
            <span className="text-[10.5px] font-bold leading-[14px] tracking-[0.3px] uppercase text-[#9A9DA4]">Upcoming Returns</span>
            <span className="text-[20px] font-extrabold leading-[22px] tracking-[-0.2px] text-[#15161A]">
              {upcomingReturnsCount}
            </span>
          </div>
          <button 
            onClick={() => onNavigateSection("allocation")}
            className="w-[36px] h-[36px] rounded-full bg-white hover:bg-[#15161A] hover:text-white text-[#15161A] flex items-center justify-center shadow-sm cursor-pointer"
          >
            <ChevronRight className="w-[16px] h-[16px]" />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[20px] items-stretch">
        
        {/* Left Column: Hero & Chart */}
        <div className="lg:col-span-8 flex flex-col gap-[20px]">
          
          {/* Hero Promo Card */}
          <div className="rounded-[24px] bg-gradient-to-br from-[#FF4D8D] to-[#FFA35C] p-[24px] text-[#FFFFFF] text-left relative overflow-hidden shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-[24px]">
            <div className="absolute right-[-10%] top-[-20%] w-[240px] h-[240px] bg-[#FFFFFF]/10 rounded-full blur-[24px] pointer-events-none" />
            
            <div className="flex flex-col gap-[12px] relative z-10 max-w-md">
              <h3 className="text-[24px] font-bold leading-[30px] tracking-[-0.3px]">Smart Resource Allocation</h3>
              <p className="text-[13px] font-normal leading-[18px] opacity-90">
                Run the AI Recommendation Agent to match unallocated company assets against pending tasks based on conditions, warranties, and locations.
              </p>
            </div>

            <button 
              onClick={() => setShowAIResult(true)}
              className="px-[16px] py-[8px] rounded-[9999px] bg-[#FFFFFF] text-[#15161A] text-[12.5px] font-semibold transition-all shadow-sm cursor-pointer shrink-0 z-10 flex items-center gap-[8px] self-stretch md:self-auto justify-center"
            >
              Run AI Engine
            </button>
          </div>

          {/* Asset utilization chart */}
          <div className="glass-panel rounded-[24px] p-[24px] flex flex-col gap-[16px] text-left">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-[4px]">
                <span className="text-[15px] font-extrabold leading-[20px] text-[#15161A]">Utilization Frequency</span>
                <span className="text-[13px] font-normal leading-[18px] text-[#5B5E66]">Active booking and allocation curves</span>
              </div>
              <span className="text-[11.5px] font-bold leading-[16px] px-[12px] py-[6px] bg-black/5 text-[#5B5E66] rounded-[8px]">
                Last 7 Days
              </span>
            </div>

            {hasNoData ? (
              <div className="h-[240px] flex flex-col items-center justify-center text-center p-6 bg-black/[0.02] rounded-[16px] border border-dashed border-neutral-200">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-2">
                  <Layers className="w-5 h-5 stroke-[1.5]" />
                </div>
                <span className="text-xs font-bold text-[#15161A]">No Asset Activity Recorded</span>
                <span className="text-[11px] text-[#9A9DA4] mt-0.5 max-w-xs">
                  Register and allocate assets to populate your 7-day utilization frequency curve.
                </span>
              </div>
            ) : (
              <div className="h-[240px] mt-[8px]">
                <LineChart 
                  data={last7DaysChartData}
                  height={230}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inverted Balance Card & Stat Cards */}
        <div className="lg:col-span-4 flex flex-col gap-[20px]">
          
          {/* Main Inverted KPI Card */}
          <div className="bg-[#15161A] rounded-[24px] p-[24px] flex flex-col gap-[20px] text-left h-full justify-between relative overflow-hidden">
            <div className="flex flex-col gap-[8px]">
              <span className="text-[13px] font-normal leading-[18px] text-[#FFFFFF] opacity-80">Overall Utilization</span>
              <span className="text-[24px] font-bold leading-[30px] tracking-[-0.3px] text-[#FFFFFF]">
                {utilizationPercentage}%
              </span>
              <p className="text-[11.5px] font-normal leading-[16px] text-[#FFFFFF] opacity-60">Calculated out of {assets.length} total assets.</p>
            </div>

            <div className="grid grid-cols-2 gap-[16px] border-t border-b border-[rgba(255,255,255,0.1)] py-[16px] my-[8px]">
              <div className="flex flex-col gap-[4px]">
                <span className="text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#FFFFFF] opacity-60">Available</span>
                <span className="text-[18px] font-bold leading-[22px] tracking-[-0.2px] text-[#FFFFFF]">
                  {assets.filter(a => a.status === "Available").length}
                </span>
              </div>
              <div className="flex flex-col gap-[4px]">
                <span className="text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#FFFFFF] opacity-60">Allocated</span>
                <span className="text-[18px] font-bold leading-[22px] tracking-[-0.2px] text-[#FFFFFF]">
                  {assets.filter(a => a.status === "Allocated").length}
                </span>
              </div>
              <div className="flex flex-col gap-[4px]">
                <span className="text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#FFFFFF] opacity-60">In Repair</span>
                <span className="text-[18px] font-bold leading-[22px] tracking-[-0.2px] text-[#FFFFFF]">
                  {assets.filter(a => a.status === "Under Maintenance").length}
                </span>
              </div>
              <div className="flex flex-col gap-[4px]">
                <span className="text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#FFFFFF] opacity-60">Lost</span>
                <span className="text-[18px] font-bold leading-[22px] tracking-[-0.2px] text-[#FFFFFF]">
                  {assets.filter(a => a.status === "Lost").length}
                </span>
              </div>
            </div>

            <div className="flex gap-[8px]">
              <button 
                onClick={() => onNavigateSection("assets")}
                className="flex-1 py-[8px] px-[20px] rounded-[9999px] bg-[#FFFFFF] text-[#15161A] text-[12.5px] font-semibold hover:opacity-90 transition-all cursor-pointer text-center"
              >
                Register
              </button>
              <button 
                onClick={() => onNavigateSection("assets")}
                className="flex-1 py-[8px] px-[20px] rounded-[9999px] border border-[rgba(255,255,255,0.2)] bg-transparent text-[#FFFFFF] text-[12.5px] font-semibold hover:bg-[rgba(255,255,255,0.1)] transition-all cursor-pointer text-center"
              >
                Browse
              </button>
            </div>
          </div>
          
          {/* Total Assets Card */}
          <div className="glass-panel bg-[#FFE7D2]/40 rounded-[24px] p-[24px] text-left flex flex-col justify-between border-[#FFA35C]/20 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold leading-[20px] text-[#15161A]">Total Assets</span>
              <div className="px-[10px] py-[5px] rounded-[9999px] bg-white text-[#15161A] text-[11px] font-extrabold flex items-center gap-[4px] shadow-sm">
                <Layers className="w-[12px] h-[12px]" /> Inventory
              </div>
            </div>
            <div className="mt-[16px]">
              <span className="text-[26px] font-extrabold leading-[30px] tracking-[-0.5px] text-[#15161A]">
                {assets.length}
              </span>
              <p className="text-[11.5px] font-normal leading-[16px] text-[#5B5E66] mt-1">
                {assets.length === 0 ? "No physical assets registered yet" : `Total tracked assets in organization`}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Row: Recent Activity Log list */}
      <div className="glass-panel rounded-[24px] p-[24px] text-left">
        <div className="flex items-center justify-between border-b border-black/5 pb-[16px] mb-[16px]">
          <div className="flex flex-col gap-[4px]">
            <span className="text-[15px] font-extrabold leading-[20px] text-[#15161A]">Recent Transactions</span>
            <span className="text-[13px] font-normal leading-[18px] text-[#5B5E66]">Latest organizational actions</span>
          </div>
          
          <span className="text-[11.5px] font-bold text-neutral-400">
            {currentOrg?.name} logs
          </span>
        </div>

        {displayLogs.length === 0 ? (
          <div className="py-[48px] text-center flex flex-col items-center gap-[12px]">
            <div className="w-[48px] h-[48px] rounded-[9999px] bg-[#E7E7E5] flex items-center justify-center text-[#5B5E66]">
              <Layers className="w-[20px] h-[20px]" />
            </div>
            <div className="flex flex-col gap-[4px]">
              <span className="text-[13px] font-semibold leading-[18px] text-[#15161A]">No activity logged yet</span>
              <p className="text-[11.5px] font-normal leading-[16px] text-[#9A9DA4] max-w-xs">
                To populate your timeline, try registering assets or creating departments.
              </p>
            </div>
            {role === "Admin" && (
              <button 
                onClick={() => onNavigateSection("setup")}
                className="mt-[8px] px-[20px] py-[8px] rounded-[9999px] bg-[#15161A] text-[#FFFFFF] text-[12.5px] font-semibold shadow cursor-pointer flex items-center gap-[8px]"
              >
                <Plus className="w-[14px] h-[14px]" /> Initialize Setup
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#ECECEA]">
                  <th className="pb-[12px] pl-[8px] text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#9A9DA4]">Operator</th>
                  <th className="pb-[12px] text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#9A9DA4]">Action</th>
                  <th className="pb-[12px] text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#9A9DA4]">Asset</th>
                  <th className="pb-[12px] text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#9A9DA4]">Details</th>
                  <th className="pb-[12px] pr-[8px] text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#9A9DA4] text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEA]">
                {displayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#E7E7E5]/30 transition-colors">
                    <td className="py-[16px] pl-[8px]">
                      <span className="block text-[13px] font-normal leading-[18px] text-[#15161A]">{log.fullName}</span>
                      <span className="block text-[11.5px] font-normal leading-[16px] text-[#9A9DA4]">{log.role}</span>
                    </td>
                    <td className="py-[16px]">
                      <span className="px-[8px] py-[4px] rounded-[9999px] text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase bg-[#FFF3DC] text-[#F5A623]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-[16px]">
                      {log.assetTag ? (
                        <div className="flex items-center gap-[8px]">
                          <div className="w-[28px] h-[28px] rounded-[8px] bg-[#E7E7E5] flex items-center justify-center">
                            <Layers className="w-[14px] h-[14px] text-[#5B5E66]" />
                          </div>
                          <span className="text-[13px] font-normal leading-[18px] text-[#15161A]">{log.assetTag}</span>
                        </div>
                      ) : (
                        <span className="text-[#9A9DA4]">—</span>
                      )}
                    </td>
                    <td className="py-[16px] text-[13px] font-normal leading-[18px] text-[#5B5E66]">{log.note}</td>
                    <td className="py-[16px] pr-[8px] text-[11.5px] font-normal leading-[16px] text-[#9A9DA4] text-right">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Recommendation Dialog Overlay */}
      {showAIResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-[24px] bg-[#15161A]/60 backdrop-blur-[4px] animate-fade-in">
          <div className="bg-[#FFFFFF] border border-[#ECECEA] rounded-[24px] p-[24px] max-w-md w-full shadow-2xl relative overflow-hidden text-left">
            <div className="absolute -top-10 -right-10 w-[128px] h-[128px] bg-gradient-to-br from-[#FF4D8D] to-[#FFA35C] rounded-full blur-[24px] pointer-events-none opacity-20" />
            
            <div className="flex items-center gap-[8px] mb-[16px]">
              <div className="w-[32px] h-[32px] rounded-[9999px] bg-gradient-to-br from-[#FF4D8D] to-[#FFA35C] flex items-center justify-center text-[#FFFFFF] shadow-sm">
                <Sparkles className="w-[16px] h-[16px]" />
              </div>
              <span className="text-[15px] font-semibold leading-[20px] text-[#15161A]">AI Recommendation Engine</span>
            </div>

            <div className="flex flex-col gap-[16px]">
              <p className="text-[13px] font-normal leading-[18px] text-[#5B5E66]">
                Analyzing your organization's active hardware profile, warranty periods, and active department assignments...
              </p>
              
              <div className="p-[16px] rounded-[16px] bg-[#FFFFFF] border border-[#ECECEA] flex flex-col gap-[8px]">
                <span className="text-[10.5px] font-medium leading-[14px] tracking-[0.3px] uppercase text-[#9A9DA4]">Top Recommended Match</span>
                <span className="text-[15px] font-semibold leading-[20px] text-[#15161A]">Dell XPS 15 (AST-1042)</span>
                
                <div className="grid grid-cols-2 gap-[8px] mt-[4px] text-[11.5px] font-normal leading-[16px]">
                  <div>
                    <span className="block text-[#9A9DA4]">Health Status</span>
                    <span className="text-[#2FBE6C] font-semibold">96% Excellent</span>
                  </div>
                  <div>
                    <span className="block text-[#9A9DA4]">Current Location</span>
                    <span className="text-[#15161A]">Main Office - Bay A</span>
                  </div>
                </div>
              </div>

              <p className="text-[11.5px] font-normal leading-[16px] text-[#9A9DA4]">
                This asset was recently verified during the quarterly audit cycle. It has optimal specs for software development and holds no outstanding reservation conflicts.
              </p>
            </div>

            <div className="flex gap-[12px] mt-[24px]">
              <button
                onClick={() => {
                  setShowAIResult(false);
                  onNavigateSection("assets");
                }}
                className="flex-1 py-[8px] px-[20px] rounded-[9999px] bg-[#15161A] text-[#FFFFFF] text-[12.5px] font-semibold hover:bg-[#15161A]/90 transition-all cursor-pointer text-center"
              >
                Inspect Asset
              </button>
              <button
                onClick={() => setShowAIResult(false)}
                className="px-[20px] py-[8px] rounded-[9999px] border border-[#ECECEA] text-[#15161A] text-[12.5px] font-semibold hover:bg-[#E7E7E5] transition-all cursor-pointer text-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
