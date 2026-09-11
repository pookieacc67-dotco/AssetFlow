import React from "react";
import { motion } from "motion/react";
import { 
  Compass, 
  CalendarRange, 
  ShieldCheck, 
  Sparkles, 
  Laptop, 
  School, 
  Activity, 
  Cpu, 
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Briefcase
} from "lucide-react";
// @ts-expect-error - Static image asset import
import heroIllustration from "../assets/images/asset_management_hero_1786250199524.jpg";
// @ts-expect-error - Static image asset import
import logoUrl from "../assets/images/logo.jpg";

interface MarketingProps {
  onNavigate: (view: "home" | "about" | "auth-landing" | "login") => void;
  currentView: "home" | "about";
}

export const Marketing: React.FC<MarketingProps> = ({ onNavigate, currentView }) => {
  const scrollToFeatures = () => {
    const el = document.getElementById("features-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen selection:flex flex-col font-sans transition-colors duration-200 bg-[#F0EFF0] relative overflow-hidden">
      {/* Premium Ambient Background Orbs */}
      <div className="absolute -top-[10%] left-[10%] w-[500px] h-[500px] bg-gradient-to-tr from-[#FF4D8D]/12 to-[#FFA35C]/12 rounded-full blur-[110px] pointer-events-none animate-float" />
      <div className="absolute top-[30%] right-[5%] w-[450px] h-[450px] bg-indigo-400/8 rounded-full blur-[90px] pointer-events-none animate-float-reverse" />
      <div className="absolute bottom-[10%] left-[5%] w-[500px] h-[500px] bg-gradient-to-br from-[#FFA35C]/10 to-[#FF4D8D]/10 rounded-full blur-[120px] pointer-events-none animate-float" style={{ animationDelay: "-3s" }} />

      {/* Public Navigation Bar */}
      <div className="sticky top-4 z-50 px-6 max-w-7xl mx-auto w-full">
        <nav className="glass-panel rounded-full px-6 py-4 flex items-center justify-between w-full shadow-[0_12px_40px_-12px_rgba(21,22,26,0.08)]">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate("home")}>
            <img src={logoUrl} alt="AssetFlow Logo" className="w-9 h-9 rounded-xl shadow-md object-cover" />
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#FF4D8D] to-[#FFA35C] bg-clip-text text-transparent">
              AssetFlow
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => onNavigate("home")} 
              className={`text-sm font-semibold transition-all duration-150 cursor-pointer ${
                currentView === "home" ? "text-[#15161A] font-extrabold border-b-2 border-[#15161A] pb-1" : "text-[#5B5E66] hover:text-[#15161A] pb-1"
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => onNavigate("about")} 
              className={`text-sm font-semibold transition-all duration-150 cursor-pointer ${
                currentView === "about" ? "text-[#15161A] font-extrabold border-b-2 border-[#15161A] pb-1" : "text-[#5B5E66] hover:text-[#15161A] pb-1"
              }`}
            >
              About
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate("login")} 
              className="px-5 py-2 rounded-full border border-neutral-200 bg-white/60 backdrop-blur hover:bg-white text-sm font-bold hover:transition-all cursor-pointer text-[#15161A]"
            >
              Login
            </button>
            <button 
              onClick={() => onNavigate("auth-landing")} 
              className="px-5 py-2 rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FFA35C] text-white text-sm font-bold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      {currentView === "home" ? (
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 md:py-20 flex flex-col gap-24">
          {/* Hero Section */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-[#15161A]"
              >
                Know where <span className="bg-gradient-to-r from-[#FF4D8D] to-[#FFA35C] bg-clip-text text-transparent">every asset</span> is, always.
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-lg md:text-xl max-w-2xl leading-relaxed"
              >
                AssetFlow is the enterprise-grade platform organizations use to track physical inventory, reserve shared meeting spaces, route maintenance approvals, and conduct visual audits — backed by secure offline state and intelligent routing.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-wrap gap-4 mt-2"
              >
                <button 
                  onClick={() => onNavigate("auth-landing")} 
                  className="px-6 py-3.5 rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FFA35C] text-white text-base font-semibold hover:opacity-95 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer"
                >
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={scrollToFeatures} 
                  className="px-6 py-3.5 rounded-full border bg-white text-base font-semibold hover:transition-all cursor-pointer"
                >
                  See How It Works
                </button>
              </motion.div>
            </div>

            {/* Custom Generated Illustration & Mockup Panel */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="lg:col-span-5 relative"
            >
              <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-br from-[#FF4D8D] to-[#FFA35C] blur-xl opacity-40" />
              <div className="relative glass-panel rounded-[32px] p-5 shadow-2xl flex flex-col gap-4 overflow-hidden border-white/70 bg-white/40">
                {/* Header Mockup */}
                <div className="flex items-center justify-between border-b border-black/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Workspace Intelligence</span>
                </div>

                {/* Main Vector Illustration with interactive feel */}
                <div className="relative rounded-[20px] overflow-hidden bg-white shadow-inner border border-black/5 group aspect-[4/3] flex items-center justify-center">
                  <img 
                    src={heroIllustration} 
                    alt="Enterprise Asset Management" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Glassmorphic overlay badge inside illustration */}
                  <div className="absolute bottom-3 left-3 right-3 glass-panel rounded-xl p-3 flex items-center justify-between border-white/80 shadow-md backdrop-blur-md bg-white/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF4D8D] to-[#FFA35C] flex items-center justify-center text-white shadow-sm">
                        <Sparkles className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">System Accuracy</span>
                        <span className="text-sm font-extrabold text-[#15161A]">99.8% Active Match</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                      Reconciled
                    </span>
                  </div>
                </div>

                {/* Supporting Mini Badges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="px-3.5 py-2.5 rounded-xl bg-white/75 border border-white flex items-center gap-2.5 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-[#15161A] tracking-tight">Active Tracking</span>
                  </div>
                  <div className="px-3.5 py-2.5 rounded-xl bg-white/75 border border-white flex items-center justify-between shadow-sm">
                    <span className="text-[11px] font-bold text-[#5B5E66]">Integrations</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-neutral-100 rounded text-[#15161A]">8+ Ready</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Feature Grid Section */}
          <section id="features-section" className="flex flex-col gap-12">
            <div className="text-center flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-widest">Platform capabilities</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#5B5E66] ">Built for operational clarity</h2>
              <p className="text-neutral-500 max-w-xl mx-auto text-sm md:text-base">
                Goodbye chaotic spreadsheets. Hello fully tracked lifecycles, structured approvals, and smart automated workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Compass className="w-6 h-6 text-[#15161A]" />,
                  title: "Asset Lifecycle Tracking",
                  desc: "Know the condition, status, allocation timeline, and complete maintenance history of everything your company owns."
                },
                {
                  icon: <CalendarRange className="w-6 h-6 text-[#15161A]" />,
                  title: "Booking & Conflict Detection",
                  desc: "Reserve conference rooms, vehicles, and high-value gear. Overlaps are detected instantly before any double-booking can happen."
                },
                {
                  icon: <ShieldCheck className="w-6 h-6 text-[#15161A]" />,
                  title: "Role-Based Workflows",
                  desc: "Built around four strict default roles — Admin, Asset Manager, Department Head, Employee. Permissions are locked to reduce mistakes."
                },
                {
                  icon: <Sparkles className="w-6 h-6 text-[#15161A]" />,
                  title: "AI-Powered Helpers",
                  desc: "Get intelligent equipment recommendations, reserve spaces using plain language, and generate custom performance reports."
                }
              ].map((feat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="glass-panel glass-card-hover p-6 rounded-[24px] border border-white/55 transition-all flex flex-col gap-4 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center">
                    {feat.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#15161A]">{feat.title}</h3>
                  <p className="text-sm leading-relaxed text-[#5B5E66]">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* How It Works Section */}
          <section className="flex flex-col gap-12 glass-panel rounded-[32px] p-8 md:p-12">
            <div className="text-center flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Straightforward Setup</span>
              <h2 className="text-3xl font-bold tracking-tight text-[#15161A]">Three steps to total control</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-4 relative">
              {[
                {
                  num: "01",
                  title: "Create your organization",
                  desc: "Sign up and build your private tenant. As the founding user, you are designated the Organization Admin."
                },
                {
                  num: "02",
                  title: "Set up team & inventory",
                  desc: "Create custom departments, pre-populate categories, and invite users via shared code or email matching."
                },
                {
                  num: "03",
                  title: "Everyone gets to work",
                  desc: "Employees file booking and maintenance requests; Department Heads and Asset Managers approve on the fly."
                }
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col gap-3 relative">
                  <div className="text-4xl font-extrabold bg-gradient-to-r from-[#FF4D8D] to-[#FFA35C] bg-clip-text text-transparent opacity-90">
                    {step.num}
                  </div>
                  <h3 className="text-lg font-bold text-[#5B5E66] ">{step.title}</h3>
                  <p className="text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* AI Callout Section - Dark Contrast Card */}
          <section className="rounded-[32px] p-8 md:p-12 bg-[#15161A] text-white text-left relative overflow-hidden shadow-xl">
            <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-[#FF4D8D]/10 to-[#FFA35C]/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row gap-12 items-start justify-between">
              <div className="flex flex-col gap-4 max-w-lg">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> AI Augmented Operations
                </div>
                <h2 className="text-3xl font-bold tracking-tight leading-tight">
                  Grounding AI in your actual assets
                </h2>
                <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                  AssetFlow features three custom AI agents designed to read and parse your inventory and booking data. They never make up stats; they explain exactly what is going on.
                </p>
              </div>

              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Asset Recommendation",
                    desc: "Find the exact equipment or device match for specific employee tasks based on historical records and conditions."
                  },
                  {
                    title: "Smart Booking Assistant",
                    desc: "Speak or type in plain language to reserve rooms, vehicles, or laptops. The agent coordinates dates automatically."
                  },
                  {
                    title: "AI Report Generator",
                    desc: "Produce structured summary charts and executive reports about asset usage, repair patterns, and audit issues."
                  }
                ].map((item, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                    <span className="font-bold text-white text-base">{item.title}</span>
                    <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final Call to Action */}
          <section className="relative rounded-[32px] overflow-hidden p-8 md:p-16 text-center flex flex-col items-center justify-center gap-6 glass-panel border-[#FFA35C]/20 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF4D8D]/5 to-[#FFA35C]/5 opacity-100 pointer-events-none" />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight relative z-10 text-[#15161A]">
              Ready to claim operational visibility?
            </h2>
            <p className="text-neutral-500 max-w-md relative z-10 text-sm md:text-base leading-relaxed font-medium">
              Create your organization in seconds. Add your teammates, file your first booking, and see your physical inventory organized instantly.
            </p>
            <button 
              onClick={() => onNavigate("auth-landing")}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FFA35C] text-white text-base font-bold hover:opacity-90 transition-all shadow-lg hover:shadow-xl relative z-10 cursor-pointer flex items-center gap-2"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </button>
          </section>
        </main>
      ) : (
        /* About View */
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 md:py-20 flex flex-col gap-16 text-left">
          <section className="flex flex-col gap-6">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-bold tracking-tight text-[#5B5E66] "
            >
              Why we built AssetFlow
            </motion.h1>
            <p className="text-base text-neutral-600 leading-relaxed">
              We noticed a simple truth: most growing companies, offices, hospitals, and agencies manage millions of dollars of hardware, keys, and physical spaces using messy spreadsheets or manual paper sign-out logs.
            </p>
            <p className="text-base text-neutral-600 leading-relaxed">
              When equipment breaks down, nobody remembers who had it last. When rooms get reserved, double-bookings create friction in the workplace. When it is time for an annual inventory count, people lose weeks running down hallways.
            </p>
            <p className="text-base text-neutral-600 leading-relaxed">
              <strong>AssetFlow</strong> was built to solve this. We replace the chaos with a beautifully structured, multi-tenant workspace where permissions are clear, resources are conflict-free, and operational reports are calculated automatically.
            </p>
          </section>

          {/* Industry Bento grid representation */}
          <section className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-[#5B5E66] ">Tailored for every physical environment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: <Laptop className="w-5 h-5 text-indigo-500" />, label: "Modern Offices", desc: "Reserve huddle rooms, assign corporate laptops, and manage desk keys." },
                { icon: <School className="w-5 h-5 text-amber-500" />, label: "Academic Schools", desc: "Track scientific equipment, book computer labs, and manage school vans." },
                { icon: <Activity className="w-5 h-5 text-rose-500" />, label: "Health Facilities", desc: "Monitor diagnostic devices, verify surgical inventories, and request rapid repairs." },
                { icon: <Cpu className="w-5 h-5 text-emerald-500" />, label: "Manufacturing Plants", desc: "Audit high-value power machinery, safety kits, and heavy machinery." }
              ].map((ind, i) => (
                <div key={i} className="p-5 bg-white rounded-2xl border shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#5B5E66] ">
                    {ind.icon} {ind.label}
                  </div>
                  <p className="text-xs leading-relaxed">{ind.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Technical Architecture Stack Transparency */}
          <section className="p-6 bg-white rounded-[24px] border flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[#5B5E66] ">Our Stack Architecture</h3>
            <p className="text-xs leading-relaxed">
              AssetFlow was written with production performance in mind. The frontend leverages React 18, TypeScript, and Tailwind CSS for snappy state adjustments. For back-end data stores, the system coordinates FastAPI, secure Firebase Identity Auth, and Supabase Postgres database schemas with Row Level Security.
            </p>
          </section>

          {/* CTA Repeat */}
          <section className="relative rounded-[24px] overflow-hidden p-8 text-center flex flex-col items-center gap-4 glass-panel border-[#FFA35C]/20 shadow-sm">
            <span className="text-sm font-bold text-[#15161A]">Set up your space in minutes</span>
            <button 
              onClick={() => onNavigate("auth-landing")}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FFA35C] text-white text-xs font-bold hover:opacity-90 transition-all shadow-md cursor-pointer"
            >
              Get Started Free
            </button>
          </section>
        </main>
      )}

      {/* Public Footer */}
      <footer className="border-t py-8 bg-white px-6">
        <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#FF4D8D] to-[#FFA35C]" />
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">AssetFlow SaaS</span>
          </div>
          <span className="text-xs text-neutral-400">
            © 2026 AssetFlow. Built with React and TypeScript. Supporting offices, schools, and laboratories.
          </span>
          <div className="flex gap-4">
            <button onClick={() => onNavigate("home")} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">Home</button>
            <button onClick={() => onNavigate("about")} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">About</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
