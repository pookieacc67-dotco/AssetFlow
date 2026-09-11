import React from "react";
import { 
  LayoutDashboard, 
  Settings, 
  Layers, 
  Calendar, 
  Wrench, 
  ClipboardCheck, 
  BarChart3, 
  Building2,
  LogOut,
  UserCheck
} from "lucide-react";
import { useAssetFlow } from "../state";
// @ts-expect-error - Static image asset import
import logoUrl from "../assets/images/logo.jpg";

interface SidebarProps {
  activeSection: string;
  onSelectSection: (section: string) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeSection, 
  onSelectSection 
}) => {
  const { currentUser, logout } = useAssetFlow();

  if (!currentUser) return null;

  const role = currentUser.role;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, visible: true },
    { id: "setup", label: "Organization Setup", icon: <Building2 className="w-5 h-5" />, visible: role === "Admin" },
    { id: "assets", label: "Assets", icon: <Layers className="w-5 h-5" />, visible: true },
    { id: "allocation", label: "Allocations & Transfers", icon: <UserCheck className="w-5 h-5" />, visible: role !== "Admin" },
    { id: "booking", label: "Resource Booking", icon: <Calendar className="w-5 h-5" />, visible: role !== "Admin" },
    { id: "maintenance", label: "Maintenance", icon: <Wrench className="w-5 h-5" />, visible: role !== "Admin" },
    { id: "audit", label: "Asset Audit", icon: <ClipboardCheck className="w-5 h-5" />, visible: role !== "Employee" },
    { id: "reports", label: "Reports", icon: <BarChart3 className="w-5 h-5" />, visible: true }
  ];

  return (
    <>
      <div className="hidden md:flex w-[64px] flex-col items-center justify-between py-6 glass-panel rounded-[32px] my-6 ml-6 h-[calc(100vh-48px)] shrink-0 relative z-10">
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Visual Brand Indicator */}
          <div className="w-10 h-10 rounded-[12px] overflow-hidden shadow-md transform hover:rotate-6 transition-transform">
            <img src={logoUrl} alt="AssetFlow Logo" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col gap-3 w-full items-center">
            {navItems.filter(item => item.visible).map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  aria-label={item.label}
                  title={item.label}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative group ${
                    isActive 
                      ? "bg-[#15161A] text-[#FFFFFF] shadow-md scale-105" 
                      : "text-[#5B5E66] bg-transparent hover:bg-white/50 hover:text-[#15161A]"
                  }`}
                >
                  {item.icon}
                  
                  {/* Horizontal Tooltip popup */}
                  <div className="absolute left-[54px] scale-0 group-hover:scale-100 transition-all origin-left bg-[#15161A] text-[#FFFFFF] text-[10.5px] font-medium px-2.5 py-1.5 rounded-[10px] whitespace-nowrap z-50 pointer-events-none shadow-md">
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout bottom circular control */}
        <div className="w-full flex justify-center">
          <button
            onClick={() => logout()}
            aria-label="Log Out"
            title="Log Out"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#FF4D4F] hover:bg-rose-500/10 transition-all cursor-pointer group relative"
          >
            <LogOut className="w-4 h-4" />
            <div className="absolute left-[54px] scale-0 group-hover:scale-100 transition-all origin-left bg-[#15161A] text-[#FFFFFF] text-[10.5px] font-medium px-2.5 py-1.5 rounded-[10px] whitespace-nowrap z-50 pointer-events-none shadow-md">
              Log Out
            </div>
          </button>
        </div>
      </div>

      <div className="flex md:hidden fixed bottom-4 left-4 right-4 h-16 glass-panel z-40 items-center justify-between gap-1 px-3 rounded-[24px] overflow-x-auto no-scrollbar pb-safe">
        {navItems.filter(item => item.visible).map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              aria-label={item.label}
              title={item.label}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative shrink-0 ${
                isActive 
                  ? "bg-[#15161A] text-[#FFFFFF] shadow-md scale-105" 
                  : "text-[#5B5E66] hover:text-[#15161A] hover:bg-white/40"
              }`}
            >
              {item.icon}
            </button>
          );
        })}
      </div>
    </>
  );
};
