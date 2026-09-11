import React, { useState, useEffect } from "react";
import { AssetFlowProvider, useAssetFlow } from "./state";
import { Marketing } from "./components/Marketing";
import { Auth } from "./components/Auth";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { DashboardView } from "./components/DashboardView";
import { OrgSetupView } from "./components/OrgSetupView";
import { AssetsView } from "./components/AssetsView";
import { AllocationView } from "./components/AllocationView";
import { BookingView } from "./components/BookingView";
import { MaintenanceView } from "./components/MaintenanceView";
import { AuditView } from "./components/AuditView";
import { ReportsView } from "./components/ReportsView";
import { SettingsView } from "./components/SettingsView";
import { MobileNotice } from "./components/MobileNotice";

function AppContent() {
  const { currentUser } = useAssetFlow();
  
  // Public-facing marketing routing state
  const [publicView, setPublicView] = useState<"home" | "about" | "auth-landing" | "login">("home");
  
  // Secure internal workspace dashboard tab state
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");

  // Remove theme from HTML classlist completely for new design system
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark");
  }, []);

  // If NOT authenticated, show Marketing / Login workflows
  if (!currentUser) {
    if (publicView === "home" || publicView === "about") {
      return (
        <>
          <Marketing 
            currentView={publicView}
            onNavigate={(view) => setPublicView(view)}
          />
          <MobileNotice />
        </>
      ); 
    }
    
    // Login, Create Org, Join Org paths
    return (
      <>
        <Auth 
          initialStep={
            publicView === "login" 
              ? "login" 
              : publicView === "auth-landing" 
                ? "landing" 
                : "landing"
          }
          onNavigate={(view) => {
            if (view === "home" || view === "about") {
              setPublicView(view);
            } else if (view === "app") {
              // Logged in!
              setPublicView("home"); // Reset for future logout
              setActiveSection("dashboard");
            }
          }}
        />
        <MobileNotice />
      </>
    );
  }

  // Helper renderer to render active section component
  const renderActiveSection = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <DashboardView 
            onNavigateSection={(sec) => setActiveSection(sec)}
            searchQuery={searchQuery}
          />
        );
      case "setup":
        return <OrgSetupView />;
      case "assets":
        return <AssetsView searchQuery={searchQuery} />;
      case "allocation":
        return <AllocationView />;
      case "booking":
        return <BookingView />;
      case "maintenance":
        return <MaintenanceView />;
      case "audit":
        return <AuditView />;
      case "reports":
        return <ReportsView />;
      case "settings":
        return <SettingsView />;
      default:
        return (
          <DashboardView 
            onNavigateSection={(sec) => setActiveSection(sec)}
            searchQuery={searchQuery}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#F0EFF0] text-[#15161A] transition-colors duration-200 overflow-hidden font-sans relative">
      
      {/* Premium Ambient Glassmorphism Orbs */}
      <div className="absolute -top-[10%] left-[10%] w-[500px] h-[500px] bg-gradient-to-tr from-[#FF4D8D]/15 to-[#FFA35C]/15 rounded-full blur-[110px] pointer-events-none animate-float" />
      <div className="absolute -bottom-[10%] right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-[#FFA35C]/15 to-[#FF4D8D]/15 rounded-full blur-[130px] pointer-events-none animate-float-reverse" />
      <div className="absolute top-[40%] left-[45%] w-[350px] h-[350px] bg-indigo-400/8 rounded-full blur-[90px] pointer-events-none animate-float" style={{ animationDelay: "-4s" }} />

      {/* Dynamic Role-Filtered Sidebar */}
      <Sidebar 
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          setSearchQuery(""); // Clear search on tab transition
        }}
      />

      {/* Main workspace pane */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        
        {/* Topbar Coordinates */}
        <Topbar 
          activeSection={activeSection}
          onSelectSection={(sec) => {
            setActiveSection(sec);
            setSearchQuery("");
          }}
          onSearch={(query) => setSearchQuery(query)}
        />

        {/* Dynamic active component viewer with viewport boundaries */}
        <main className="flex-1 overflow-y-auto px-[24px] pt-[24px] pb-[96px] md:pb-[40px] md:px-[32px]">
          <div className="max-w-[1280px] mx-auto w-full">
            {renderActiveSection()}
          </div>
        </main>

      </div>

      {/* Sweet Mobile Notice Modal */}
      <MobileNotice />

    </div>
  );
}

export default function App() {
  return (
    <AssetFlowProvider>
      <AppContent />
    </AssetFlowProvider>
  );
}
