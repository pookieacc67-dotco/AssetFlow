import React, { useState, useMemo } from "react";
import { useAssetFlow } from "../state";
import { Asset } from "../types";
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Layers, 
  Calendar, 
  Wrench, 
  UserCheck, 
  MapPin, 
  Folder,
  Tag,
  Hash,
  Sparkles,
  Info
} from "lucide-react";

interface AssetsProps {
  searchQuery: string;
}

export const AssetsView: React.FC<AssetsProps> = ({ searchQuery: topSearch }) => {
  const { 
    currentUser, 
    assets, 
    categories, 
    registerAsset, 
    addCategory,
    allocations, 
    maintenance, 
    users 
  } = useAssetFlow();

  const [localSearch, setLocalSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Registration form modal state
  const [registerOpen, setRegisterOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newAcqDate, setNewAcqDate] = useState(new Date().toISOString().split("T")[0]);
  const [newCondition, setNewCondition] = useState<Asset["condition"]>("New");
  const [newLocation, setNewLocation] = useState("");

  // Timeline detailed drawer/modal state
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // AI Assistant state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);

  const handleGetRecommendation = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, assets }),
      });
      if (!response.ok) {
        throw new Error("AI request failed. Please ensure the server is fully started.");
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAiResult(data);
    } catch (err: any) {
      setAiError(err.message || "Failed to contact Gemini AI engine.");
    } finally {
      setAiLoading(false);
    }
  };

  const activeSearch = topSearch || localSearch;
  const canRegister = currentUser?.role === "Asset Manager" || currentUser?.role === "Admin";

  const ensureCategoriesExist = () => {
    if (categories.length === 0) {
      addCategory("Electronics", 24, ["Processor", "RAM", "Storage"]);
      addCategory("Furniture", 60, ["Material", "Dimensions"]);
      addCategory("IT Equipment", 12, ["Brand", "OS"]);
      addCategory("Office Supplies", 0, []);
    }
  };

  // Filter list
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // 1. Search Query Match
      if (activeSearch.trim()) {
        const query = activeSearch.toLowerCase();
        const match = a.name.toLowerCase().includes(query) || 
                      a.tag.toLowerCase().includes(query) || 
                      a.serialNumber.toLowerCase().includes(query) ||
                      a.location.toLowerCase().includes(query);
        if (!match) return false;
      }
      
      // 2. Category Match
      if (selectedCategory !== "all" && a.categoryId !== selectedCategory) {
        return false;
      }

      // 3. Status Match
      if (selectedStatus !== "all" && a.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [assets, activeSearch, selectedCategory, selectedStatus]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCategory || !newSerial.trim() || !newLocation.trim()) {
      alert("Please fill out all required fields.");
      return;
    }

    registerAsset({
      name: newName,
      categoryId: newCategory,
      serialNumber: newSerial,
      acquisitionDate: newAcqDate,
      condition: newCondition,
      location: newLocation
    });

    // Reset Form
    setNewName("");
    setNewCategory("");
    setNewSerial("");
    setNewLocation("");
    setRegisterOpen(false);
  };

  const getStatusBadgeStyle = (status: Asset["status"]) => {
    switch (status) {
      case "Available": 
        return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
      case "Allocated": 
        return "bg-[#F4F4F6] text-[#5B5E66] border border-neutral-200/50";
      case "Under Maintenance": 
        return "bg-amber-50 text-amber-700 border border-amber-200/60";
      case "Lost": 
      case "Damaged":
        return "bg-rose-50 text-rose-700 border border-rose-200/60";
      default: 
        return "bg-rose-50 text-rose-700 border border-rose-200/60";
    }
  };

  // Get audit / allocation history for detailed visual timeline
  const assetTimeline = useMemo(() => {
    if (!selectedAsset) return [];
    
    // Allocations
    const assetAllocations = allocations
      .filter(al => al.assetTag === selectedAsset.tag)
      .map(al => ({
        date: al.assignedDate,
        title: al.status === "Returned" ? "Returned from Assignee" : "Allocated to User",
        desc: `Holder: ${users.find(u => u.id === al.userId)?.fullName || "Employee"}`,
        icon: <UserCheck className="w-3.5 h-3.5 text-[#15161A]" />
      }));

    // Maintenance logs
    const assetMaint = maintenance
      .filter(m => m.assetTag === selectedAsset.tag)
      .map(m => ({
        date: m.createdAt.split("T")[0],
        title: `Repair filed (${m.status})`,
        desc: m.description,
        icon: <Wrench className="w-3.5 h-3.5 text-[#F5A623]" />
      }));

    return [...assetAllocations, ...assetMaint].sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedAsset, allocations, maintenance, users]);

  return (
    <div className="flex flex-col gap-6 text-left py-2 relative">
      
      {/* Top filter + Action controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-widest">Active Directory</span>
          <h2 className="text-2xl font-extrabold ">Assets Registry</h2>
        </div>

        <div className="flex items-center gap-2.5 self-start">
          <button 
            onClick={() => setIsAiOpen(!isAiOpen)}
            className="px-5 py-3 rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FFA35C] text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4" /> Ask AI Recommendation
          </button>

          {canRegister && (
            <button 
              onClick={() => {
                ensureCategoriesExist();
                setRegisterOpen(true);
              }}
              className="px-5 py-3 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Register Asset
            </button>
          )}
        </div>
      </div>

      {/* AI Assistant Section */}
      {isAiOpen && (
        <div className="bg-gradient-to-br from-[#FF4D8D]/5 to-[#FFA35C]/5 p-6 rounded-[16px] border border-[#ECECEA] shadow-lg flex flex-col gap-4 text-left">
          <div className="flex justify-between items-center pb-2 border-b ">
            <span className="font-extrabold text-sm  flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#15161A]" /> Asset Recommendation Assistant (Gemini)
            </span>
            <button 
              onClick={() => setIsAiOpen(false)}
              className="w-7 h-7 rounded-full bg-white  border  flex items-center justify-center text-xs text-[#5B5E66] hover:text-white cursor-pointer"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-[#5B5E66] ">
              State your precise hardware requirements in plain-English. Gemini will analyze the organization's actually-available physical assets and return a ranked candidate list.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Need a light-weight developer laptop with at least 16GB RAM for coding on travel..."
                className="flex-1 px-4 py-2.5 rounded-[16px] border  bg-white  text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4D8D]"
              />
              <button
                onClick={handleGetRecommendation}
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-5 py-2.5 rounded-full bg-[#15161A] text-white text-xs font-bold shadow hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {aiLoading ? "Analyzing..." : "Find Matches"}
              </button>
            </div>
          </div>

          {aiError && (
            <div className="p-3.5 bg-[#FFE9E9]  text-[#FF4D4F]  text-xs rounded-[16px] border border-rose-100 ">
              {aiError}
            </div>
          )}

          {aiResult && (
            <div className="flex flex-col gap-4 mt-1 bg-[#FFFFFF]  p-4 rounded-[16px] border ">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">AI Analysis & Explanations</span>
                <p className="text-xs text-[#5B5E66]  leading-relaxed font-medium">
                  {aiResult.summary}
                </p>
              </div>

              {aiResult.recommendations && aiResult.recommendations.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Ranked Candidate Matches</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {aiResult.recommendations.map((rec: any, idx: number) => {
                      const matchedAsset = assets.find((a: any) => a.tag === rec.assetTag);
                      if (!matchedAsset) return null;
                      return (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedAsset(matchedAsset)}
                          className="p-3.5 bg-white  border border-neutral-100  rounded-[16px] hover:cursor-pointer transition-all flex flex-col gap-1.5 text-left group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black px-2 py-0.5 rounded-md">
                                #{rec.rank}
                              </span>
                              <span className="text-xs font-bold  group-hover:transition-colors">
                                {matchedAsset.name}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-[#5B5E66] font-mono">
                              {rec.assetTag}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5B5E66]  leading-relaxed font-medium">
                            {rec.explanation}
                          </p>
                          <div className="flex items-center justify-between pt-1 border-t border-neutral-50  mt-1">
                            <span className="text-[9px] text-[#5B5E66] font-bold uppercase">
                              Condition: {matchedAsset.condition}
                            </span>
                            <span className="text-[9px] text-[#5B5E66] font-bold uppercase">
                              Location: {matchedAsset.location}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#5B5E66] italic">No exact physical matches found in directory. Try refining your request text.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Internal Filter Toolbar */}
      <div className="bg-[#FFFFFF]   p-4 rounded-[16px] border  shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Filter Selection Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-[#5B5E66] uppercase tracking-wider pl-1">Category</span>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-1.5  border-none rounded-full text-xs font-semibold text-[#5B5E66]  focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-[#5B5E66] uppercase tracking-wider pl-1">Status</span>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3.5 py-1.5  border-none rounded-full text-xs font-semibold text-[#5B5E66]  focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Allocated">Allocated</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Lost">Lost</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>
        </div>

        {/* Local Search backup if no top bar search */}
        {!topSearch && (
          <div className="relative w-full md:w-60">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search by serial, location..."
              className="w-full pl-9 pr-4 py-2  border-none rounded-full text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#FF4D8D]"
            />
          </div>
        )}
      </div>

      {/* Table & Directory listing */}
      {filteredAssets.length === 0 ? (
        <div className="bg-[#FFFFFF]   rounded-[16px] border  shadow-sm p-12 text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-[#15161A]">
            <Layers className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold ">No assets found</span>
            <p className="text-[11px] text-[#5B5E66] max-w-xs">
              {assets.length === 0 
                ? "Your organization inventory starts completely empty. Register your first asset."
                : "No items match your active search terms or category filtration."}
            </p>
          </div>
          {canRegister && assets.length === 0 && (
            <button 
              onClick={() => {
                ensureCategoriesExist();
                setRegisterOpen(true);
              }}
              className="px-5 py-2.5 rounded-full bg-[#15161A] hover:bg-black text-white text-xs font-bold cursor-pointer"
            >
              Add First Asset
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#FFFFFF]   rounded-[16px] border  shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-[#5B5E66] uppercase tracking-wider font-semibold">
                  <th className="py-4 pl-4">Tag Code</th>
                  <th className="py-4">Asset Name</th>
                  <th className="py-4">Category</th>
                  <th className="py-4">Current Status</th>
                  <th className="py-4">Location</th>
                  <th className="py-4 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEA]">
                {filteredAssets.map((asset) => {
                  const cat = categories.find(c => c.id === asset.categoryId);
                  return (
                    <tr 
                      key={asset.tag} 
                      className="hover:bg-[#F4F4F6] cursor-pointer transition-colors"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <td className="py-4 pl-4 font-bold font-mono">{asset.tag}</td>
                      <td className="py-4 font-bold ">{asset.name}</td>
                      <td className="py-4 text-[#5B5E66] font-semibold">{cat?.name || "Equipment"}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${getStatusBadgeStyle(asset.status)}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-4 text-[#5B5E66] font-semibold">{asset.location}</td>
                      <td className="py-4 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setSelectedAsset(asset)}
                          className="px-3 py-1 text-[10px] font-bold rounded-full hover:bg-[#F4F4F6] cursor-pointer"
                        >
                          History
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Asset Modal Dialog */}
      {registerOpen && (
        <div className="fixed inset-0 bg-black/40  flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[32px] border shadow-xl p-8 max-w-md w-full flex flex-col gap-5 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-[#ECECEA]">
              <span className="font-extrabold text-lg flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-[#15161A]" /> Register New Asset
              </span>
              <button 
                onClick={() => setRegisterOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-[#5B5E66] hover:text-[#5B5E66]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">Asset Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#15161A]"><Tag className="w-3.5 h-3.5" /></span>
                  <input 
                    type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., MacBook Pro 16"
                    className="w-full pl-9 pr-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#5B5E66]">Category</label>
                  <select 
                    required value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#5B5E66]">Serial Number</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#15161A]"><Hash className="w-3.5 h-3.5" /></span>
                    <input 
                      type="text" required value={newSerial} onChange={(e) => setNewSerial(e.target.value)}
                      placeholder="e.g., SN-92813X"
                      className="w-full pl-9 pr-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#5B5E66]">Acquisition Date</label>
                  <input 
                    type="date" required value={newAcqDate} onChange={(e) => setNewAcqDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#5B5E66]">Condition</label>
                  <select 
                    value={newCondition} onChange={(e) => setNewCondition(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                  >
                    <option value="New">New (Factory Sealed)</option>
                    <option value="Good">Good (Operational)</option>
                    <option value="Fair">Fair (Slight wear)</option>
                    <option value="Poor">Poor (Inoperable)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#5B5E66]">Storage / Office Location</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#15161A]"><MapPin className="w-3.5 h-3.5" /></span>
                  <input 
                    type="text" required value={newLocation} onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g., Main Office, Cabinet B"
                    className="w-full pl-9 pr-4 py-2.5 rounded-[16px] border bg-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-[#15161A] hover:bg-black text-white rounded-full text-xs font-bold mt-2 shadow cursor-pointer"
              >
                Register into Inventory
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Timeline Drawer Dialog */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/40  flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[32px] border shadow-xl p-8 max-w-md w-full flex flex-col gap-5 text-left max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-[#ECECEA]">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono font-bold text-[#15161A]">{selectedAsset.tag}</span>
                <span className="font-extrabold text-base text-[#15161A]">{selectedAsset.name}</span>
              </div>
              <button 
                onClick={() => setSelectedAsset(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-[#5B5E66] hover:text-[#5B5E66]"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-[16px] text-xs">
                <div>
                  <span className="block text-[10px] text-[#5B5E66] font-bold uppercase">Serial Number</span>
                  <span className="font-bold font-mono text-[#5B5E66]">{selectedAsset.serialNumber}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#5B5E66] font-bold uppercase">Location</span>
                  <span className="font-bold text-[#5B5E66]">{selectedAsset.location}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#5B5E66] font-bold uppercase">Condition</span>
                  <span className="font-bold text-[#5B5E66]">{selectedAsset.condition}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-[#5B5E66] font-bold uppercase">Acquired Date</span>
                  <span className="font-bold text-[#5B5E66]">{selectedAsset.acquisitionDate}</span>
                </div>
              </div>

              {/* History Timeline */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider">Asset Lifecycle Log</span>
                
                {assetTimeline.length === 0 ? (
                  <div className="p-4 rounded-[16px] border border-dashed text-center text-xs text-[#5B5E66]">
                    No historical logs or maintenance files associated with this asset yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 border-l border-neutral-200 pl-4 ml-2.5 mt-2 relative">
                    {assetTimeline.map((item, idx) => (
                      <div key={idx} className="relative flex flex-col gap-1 text-xs">
                        <div className="absolute left-[-24px] w-5 h-5 rounded-full border border-neutral-200 flex items-center justify-center">
                          {item.icon}
                        </div>
                        <span className="font-bold text-[#15161A]">{item.title}</span>
                        <p className="text-[#5B5E66] font-medium text-[11px]">{item.desc}</p>
                        <span className="text-[9px] text-[#5B5E66] mt-0.5">{item.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setSelectedAsset(null)}
              className="w-full py-2.5 rounded-full border bg-white text-xs font-bold hover:cursor-pointer text-center"
            >
              Close History Logs
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
