import { BookOpen, Stethoscope, User, Plus, Combine, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { MasterAgent } from "@/types";

interface SidebarProps {
  activeTab: "extractor" | "tester";
  setActiveTab: (tab: "extractor" | "tester") => void;
  masters: MasterAgent[];
  currentMasterId: string;
  setCurrentMasterId: (id: string) => void;
  onCreateMaster: () => void;
  onMergeMasters: () => void;
}

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  masters, 
  currentMasterId, 
  setCurrentMasterId, 
  onCreateMaster, 
  onMergeMasters 
}: SidebarProps) {
  return (
    <div className="w-64 bg-stone-900 text-stone-300 flex flex-col h-full border-r border-stone-800">
      <div className="p-6 border-b border-stone-800 flex items-center gap-3">
        <div className="bg-emerald-600 p-2 rounded-lg text-white">
          <BookOpen size={20} />
        </div>
        <h1 className="text-lg font-serif font-semibold text-stone-100 tracking-wide">
          中医泰斗智能体
        </h1>
      </div>
      
      <div className="p-4 border-b border-stone-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">名老中医</h2>
          <button 
            onClick={onCreateMaster}
            className="text-stone-400 hover:text-emerald-400 transition-colors"
            title="添加新泰斗"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {masters.map(master => (
            <button
              key={master.id}
              onClick={() => setCurrentMasterId(master.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm",
                currentMasterId === master.id
                  ? "bg-stone-800 text-stone-100"
                  : "hover:bg-stone-800/50 hover:text-stone-200"
              )}
            >
              <span className="truncate">{master.name}</span>
              {master.knowledge && (
                <Database size={12} className="text-emerald-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
        
        <button
          onClick={onMergeMasters}
          className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-stone-700 hover:bg-stone-800 transition-colors text-xs font-medium text-stone-400 hover:text-stone-200"
          title="融合所有已提取知识的泰斗"
        >
          <Combine size={14} />
          融合所选泰斗
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 px-2">操作</h2>
        <button
          onClick={() => setActiveTab("extractor")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium",
            activeTab === "extractor"
              ? "bg-stone-800 text-emerald-400 shadow-sm"
              : "hover:bg-stone-800/50 hover:text-stone-100"
          )}
        >
          <BookOpen size={18} />
          医案知识提取
        </button>
        <button
          onClick={() => setActiveTab("tester")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium",
            activeTab === "tester"
              ? "bg-stone-800 text-emerald-400 shadow-sm"
              : "hover:bg-stone-800/50 hover:text-stone-100"
          )}
        >
          <Stethoscope size={18} />
          智能体诊疗测试
        </button>
      </nav>
      
      <div className="p-4 border-t border-stone-800">
        <div className="flex items-center gap-3 px-4 py-2">
          <User size={16} className="text-stone-500" />
          <span className="text-xs text-stone-500 font-mono">版本 1.1.0</span>
        </div>
      </div>
    </div>
  );
}
