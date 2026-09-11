import React, { useState } from "react";
import { useAssetFlow } from "../state";
import { 
  User as UserIcon, 
  Settings as SettingsIcon, 
  Mail, 
  Phone, 
  Briefcase, 
  Lock, 
  Bell, 
  ShieldAlert,
  Sparkles,
  Info
} from "lucide-react";

export const SettingsView: React.FC = () => {
  const { currentUser, theme, setTheme, updateUserRole } = useAssetFlow();

  const [notifAll, setNotifAll] = useState(true);
  const [notifAlert, setNotifAlert] = useState(true);
  const [notifApprovals, setNotifApprovals] = useState(true);
  const [notifBookings, setNotifBookings] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  if (!currentUser) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      alert("Passwords do not match!");
      return;
    }
    alert("Password updated successfully.");
    setNewPass("");
    setConfirmPass("");
    setPasswordModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 text-left py-2">
      
      {/* Visual Header */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-widest">User Control Center</span>
        <h2 className="text-2xl font-extrabold ">Profile & Settings</h2>
        <p className="text-xs text-[#15161A]">Manage password keys, notification bell toggles, and UI preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Profile Card & password change */}
        <div className="lg:col-span-6 bg-white  p-6 rounded-[24px] border  shadow-sm flex flex-col gap-5">
          <span className="font-bold text-base  flex items-center gap-1.5">
            <UserIcon className="w-4.5 h-4.5 text-[#15161A]" /> Profile Coordinates
          </span>

          {/* Avatar Upload mockup (Section 7 Profile brief) */}
          <div className="flex items-center gap-4 border-b pb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br p-0.5 relative group">
              <div className="w-full h-full rounded-full bg-white  flex items-center justify-center overflow-hidden">
                <span className="text-lg font-bold ">
                  {currentUser.fullName.split(" ").map(w => w[0]).join("")}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <span className="text-xs font-extrabold ">{currentUser.fullName}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-[#5B5E66] font-bold uppercase">Role:</span>
                <select
                  value={currentUser.role}
                  onChange={(e) => updateUserRole(currentUser.id, e.target.value as any)}
                  className="px-2 py-0.5 border   rounded-md text-[10px] font-extrabold  focus:outline-none cursor-pointer"
                >
                  <option value="Admin">Admin</option>
                  <option value="Asset Manager">Asset Manager</option>
                  <option value="Department Head">Department Head</option>
                  <option value="Employee">Employee</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 text-xs text-[#5B5E66] font-medium">
            <div className="flex items-center justify-between p-3  rounded-[16px]">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#15161A]" />
                <span>Verification Email</span>
              </div>
              <span className=" font-bold">{currentUser.email || "Unlinked"}</span>
            </div>

            <div className="flex items-center justify-between p-3  rounded-[16px]">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#15161A]" />
                <span>Verification Phone</span>
              </div>
              <span className=" font-bold">{currentUser.phone || "Unlinked"}</span>
            </div>

            <div className="flex items-center justify-between p-3  rounded-[16px]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#15161A]" />
                <span>Assigned Department</span>
              </div>
              <span className=" font-bold">Main Headquarters</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setPasswordModalOpen(true)}
            className="w-full py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold hover:opacity-95 shadow cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <Lock className="w-4 h-4" /> Change Credentials Key
          </button>
        </div>

        {/* Right Column: General Settings toggles */}
        <div className="lg:col-span-6 bg-white  p-6 rounded-[24px] border  shadow-sm flex flex-col gap-5 text-left">
          <span className="font-bold text-base  flex items-center gap-1.5">
            <SettingsIcon className="w-4.5 h-4.5 text-[#15161A]" /> Workspace Preferences
          </span>

          {/* Theme custom toggle */}
          <div className="flex items-center justify-between p-3.5  rounded-[16px]">
            <div className="flex flex-col text-left gap-0.5">
              <span className="text-xs font-bold ">Dark Luxury Scheme</span>
              <p className="text-[10px] text-[#5B5E66]">Enable warm eye-safe low light canvas layout.</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" checked={theme === "dark"} onChange={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#F4F4F6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:height-4 after:h-4 after:w-4 after:transition-all peer-checked:bg-[#15161A]"></div>
            </label>
          </div>

          {/* Notification bell checkboxes */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" /> Notifications Bell Configuration
            </span>

            <div className="flex flex-col gap-2">
              {[
                { state: notifAll, set: setNotifAll, label: "Enable Global Alerts", desc: "Toggle all email/SMS transactional notifications." },
                { state: notifAlert, set: setNotifAlert, label: "System Alerts & Faults", desc: "Receive immediate triggers when hardware fails audits." },
                { state: notifApprovals, set: setNotifApprovals, label: "Approvals Handover", desc: "Get notified when department heads confirm transfers." },
                { state: notifBookings, set: setNotifBookings, label: "Room Bookings Reminders", desc: "Receive reminders 15 minutes before reservations start." }
              ].map((item, idx) => (
                <label key={idx} className="flex items-start justify-between p-3.5 rounded-[16px] hover:bg-[#F4F4F6] :bg-[#F4F4F6] transition-all cursor-pointer">
                  <div className="flex flex-col gap-0.5 text-left max-w-xs">
                    <span className="text-xs font-bold ">{item.label}</span>
                    <p className="text-[10px] text-[#5B5E66] leading-tight">{item.desc}</p>
                  </div>
                  <input 
                    type="checkbox" checked={item.state} onChange={(e) => item.set(e.target.checked)}
                    className="rounded border-neutral-300 focus:h-4 w-4 mt-1"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Change Password Modal Dialog (Section 7 Profile brief) */}
      {passwordModalOpen && (
        <div className="fixed inset-0 bg-black/40  flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[32px] border shadow-xl p-8 max-w-sm w-full flex flex-col gap-5 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-[#ECECEA]">
              <span className="font-extrabold text-lg flex items-center gap-1.5">
                <Lock className="w-5 h-5 text-[#15161A]" /> Change Password Key
              </span>
              <button 
                onClick={() => setPasswordModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-[#5B5E66] hover:text-[#5B5E66]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">New Password Key</label>
                <input 
                  type="password" required value={newPass} onChange={(e) => setNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none focus:border-[#ECECEA]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">Confirm New Password</label>
                <input 
                  type="password" required value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none focus:border-[#ECECEA]"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-2.5 bg-[#15161A] hover:bg-black text-white rounded-full text-xs font-bold mt-2 shadow cursor-pointer"
              >
                Save New Password
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
