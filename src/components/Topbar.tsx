import React, { useState } from "react";
import { useAssetFlow } from "../state";
import { 
  Bell, 
  Search, 
  User as UserIcon, 
  LogOut, 
  Check,
  AlertTriangle,
  CalendarCheck,
  Clock,
  Sparkles
} from "lucide-react";
// @ts-expect-error - Static image asset import
import logoUrl from "../assets/images/logo.jpg";

interface TopbarProps {
  onSearch: (query: string) => void;
  onSelectSection: (section: string) => void;
  activeSection: string;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  onSearch, 
  onSelectSection, 
  activeSection
}) => {
  const { 
    currentUser, 
    currentOrg, 
    notifications, 
    markNotificationsRead, 
    logout 
  } = useAssetFlow();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<"all" | "alert" | "approval" | "booking">("all");
  const [searchVal, setSearchVal] = useState("");

  if (!currentUser) return null;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch(e.target.value);
  };

  const filteredNotifs = notifications.filter(n => {
    if (notifTab === "all") return true;
    return n.type === notifTab;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotifIcon = (type: string) => {
    switch (type) {
      case "alert": return <AlertTriangle className="w-[14px] h-[14px] text-[#F5A623]" />;
      case "approval": return <Check className="w-[14px] h-[14px] text-[#2FBE6C]" />;
      case "booking": return <CalendarCheck className="w-[14px] h-[14px] text-[#5B5E66]" />;
      default: return <Sparkles className="w-[14px] h-[14px] text-[#FF6FA8]" />;
    }
  };

  return (
    <div className="w-full px-[24px] pt-[24px] shrink-0 relative z-30">
      <header className="h-[64px] glass-panel rounded-[9999px] px-[16px] flex items-center justify-between">
        
        {/* Wordmark and tenant title */}
        <div className="flex items-center gap-[8px] pl-[8px]">
          <img src={logoUrl} alt="Logo" className="w-6 h-6 rounded-md object-cover shadow-sm" />
          <span className="font-extrabold text-[16px] text-[#15161A] font-sans tracking-tight bg-gradient-to-r from-[#FF4D8D] to-[#FFA35C] bg-clip-text text-transparent">AssetFlow</span>
          <span className="text-[12px] text-[#9A9DA4] font-semibold select-none hidden sm:inline">•</span>
          <span className="text-[12px] font-bold text-[#5B5E66] hidden sm:inline truncate max-w-[120px] md:max-w-[180px]">
            {currentOrg?.name || "Acme Logistics"}
          </span>
        </div>

        {/* Center interactive pill tabs */}
        <div className="hidden lg:flex p-[4px] gap-[4px] bg-black/5 rounded-[9999px]">
          {[
            { id: "dashboard", label: "Overview" },
            { id: "assets", label: "Assets" },
            { id: "reports", label: "Analytics" }
          ].map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectSection(tab.id)}
                className={`px-[16px] py-[8px] rounded-[9999px] text-[13px] font-bold transition-all cursor-pointer ${
                  isActive 
                    ? "bg-[#15161A] text-[#FFFFFF] shadow-sm" 
                    : "bg-transparent text-[#5B5E66] hover:bg-white/40 hover:text-[#15161A]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-[12px] md:gap-[16px]">
          
          {/* Search Input block */}
          <div className="relative max-w-xs hidden sm:block">
            <Search className="w-[14px] h-[14px] text-[#9A9DA4] absolute left-[12px] top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchVal}
              onChange={handleSearchChange}
              placeholder="Search assets, codes..."
              className="w-[160px] xl:w-[200px] pl-[32px] pr-[16px] py-[8px] rounded-[9999px] glass-input text-[13px] text-[#15161A] placeholder-[#9A9DA4] focus:outline-none"
            />
          </div>

          {/* Dynamic Notification Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileMenuOpen(false);
                if (!notifOpen) markNotificationsRead();
              }}
              className="w-[40px] h-[40px] rounded-[9999px] flex items-center justify-center bg-white/20 hover:bg-white/60 text-[#15161A] transition-colors cursor-pointer relative"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-[4px] right-[4px] w-[14px] h-[14px] rounded-[9999px] bg-[#FF4D4F] text-[#FFFFFF] font-bold text-[9px] flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* User Avatar Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileMenuOpen(!profileMenuOpen);
                setNotifOpen(false);
              }}
              className="w-[36px] h-[36px] rounded-[9999px] cursor-pointer relative overflow-hidden bg-gradient-to-br from-[#FF4D8D] to-[#FFA35C] flex items-center justify-center text-[#FFFFFF] shadow-sm hover:scale-105 transition-transform"
            >
              <span className="text-[12px] font-bold">
                {currentUser.fullName.split(" ").map(w => w[0]).join("").substring(0, 2)}
              </span>
            </button>
          </div>

        </div>
      </header>

      {/* Floating drop menu panels positioned outside the header to bypass backdrop-filter stacking issues */}
      {notifOpen && (
        <div className="absolute right-[40px] top-[92px] w-[320px] max-w-[calc(100vw-48px)] bg-white border border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.12)] rounded-[24px] p-[16px] flex flex-col gap-[12px] z-50">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#15161A]">Notifications</span>
            <span className="text-[11.5px] text-[#9A9DA4] font-medium">Unread count: {unreadCount}</span>
          </div>

          {/* Filtering pill group */}
          <div className="grid grid-cols-4 p-[4px] bg-black/5 rounded-[12px]">
            {(["all", "alert", "approval", "booking"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setNotifTab(tab)}
                className={`py-[4px] rounded-[8px] text-[10.5px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  notifTab === tab 
                    ? "bg-[#FFFFFF] text-[#15161A] shadow-sm" 
                    : "text-[#5B5E66] hover:text-[#15161A]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Notification rows */}
          <div className="flex flex-col gap-[8px] max-h-[240px] overflow-y-auto">
            {filteredNotifs.length === 0 ? (
              <div className="py-[32px] text-center text-[13px] text-[#9A9DA4]">
                No notifications in this filter
              </div>
            ) : (
              filteredNotifs.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-[8px] rounded-[16px] text-left border flex gap-[8px] items-start transition-all ${
                    !n.isRead 
                      ? "border-rose-100 bg-rose-50/40" 
                      : "bg-[#FFFFFF]/40 border-transparent hover:bg-white/70"
                  }`}
                >
                  <div className="w-[28px] h-[28px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#FFFFFF] border border-[#ECECEA]">
                    {renderNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 flex flex-col gap-[2px]">
                    <span className="text-[11.5px] font-bold text-[#15161A]">{n.title}</span>
                    <p className="text-[10.5px] text-[#5B5E66] leading-tight">{n.message}</p>
                    <span className="text-[10.5px] text-[#9A9DA4] flex items-center gap-[4px] mt-[2px]">
                      <Clock className="w-[10px] h-[10px]" /> Just now
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-black/5 pt-[8px] text-center">
            <button 
              onClick={() => { setNotifOpen(false); onSelectSection("dashboard"); }}
              className="text-[11.5px] font-bold text-[#15161A] hover:underline"
            >
              View recent activity
            </button>
          </div>
        </div>
      )}

      {profileMenuOpen && (
        <div className="absolute right-[40px] top-[92px] w-[200px] bg-white border border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.12)] rounded-[24px] p-[8px] flex flex-col gap-[4px] z-50">
          <div className="px-[12px] py-[8px] border-b border-black/5 mb-[4px] flex flex-col text-left">
            <span className="text-[13px] font-bold text-[#15161A] truncate">{currentUser.fullName}</span>
            <span className="text-[11.5px] text-[#5B5E66] font-semibold truncate">{currentUser.role}</span>
          </div>

          <button
            onClick={() => { setProfileMenuOpen(false); onSelectSection("settings"); }}
            className="w-full px-[12px] py-[8px] rounded-[16px] text-[12.5px] font-bold text-left hover:bg-white/40 flex items-center gap-[8px] text-[#15161A] cursor-pointer"
          >
            <UserIcon className="w-[14px] h-[14px]" /> Profile Details
          </button>
          
          <hr className="border-black/5 my-[4px]" />

          <button
            onClick={() => logout()}
            className="w-full px-[12px] py-[8px] rounded-[16px] text-[12.5px] font-bold text-left text-[#FF4D4F] hover:bg-[#FFE9E9] flex items-center gap-[8px] cursor-pointer"
          >
            <LogOut className="w-[14px] h-[14px]" /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
