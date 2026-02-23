/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { KnowledgeExtractor } from "./components/KnowledgeExtractor";
import { AgentTester } from "./components/AgentTester";
import { ExtractedKnowledge } from "./services/geminiService";
import { MasterAgent } from "./types";
import { Menu, X } from "lucide-react";
import { get, set } from "idb-keyval";

export interface CurrentDoc {
  base64: string;
  mimeType: string;
  name: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"extractor" | "tester">("extractor");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentDocs, setCurrentDocs] = useState<Record<string, CurrentDoc>>({});
  const [masters, setMasters] = useState<MasterAgent[]>(() => {
    const saved = localStorage.getItem("tcm-masters");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse masters from local storage", e);
      }
    }
    return [{ id: "1", name: "泰斗 1", knowledge: null }];
  });
  const [currentMasterId, setCurrentMasterId] = useState<string>(() => {
    return localStorage.getItem("tcm-current-master-id") || "1";
  });

  useEffect(() => {
    get("tcm-current-docs").then((val) => {
      if (val) {
        setCurrentDocs(val);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    localStorage.setItem("tcm-masters", JSON.stringify(masters));
  }, [masters]);

  useEffect(() => {
    localStorage.setItem("tcm-current-master-id", currentMasterId);
  }, [currentMasterId]);

  const currentMaster = masters.find(m => m.id === currentMasterId) || masters[0];

  const handleUpdateKnowledge = (newKnowledge: ExtractedKnowledge) => {
    setMasters(prev => prev.map(m => 
      m.id === currentMasterId ? { ...m, knowledge: newKnowledge } : m
    ));
    // We don't auto-switch to tester tab here so the user can see the "Continue Extraction" option
  };

  const handleSetCurrentDoc = (doc: CurrentDoc | null) => {
    setCurrentDocs(prev => {
      const next = { ...prev };
      if (doc) {
        next[currentMasterId] = doc;
      } else {
        delete next[currentMasterId];
      }
      set("tcm-current-docs", next).catch(console.error);
      return next;
    });
  };

  const handleCreateMaster = () => {
    const newId = Date.now().toString();
    setMasters(prev => [...prev, { id: newId, name: `泰斗 ${prev.length + 1}`, knowledge: null }]);
    setCurrentMasterId(newId);
    setActiveTab("extractor");
    setIsMobileMenuOpen(false);
  };

  const handleMergeMasters = () => {
    const validMasters = masters.filter(m => m.knowledge !== null);
    if (validMasters.length < 2) {
      alert("至少需要两位已提取知识的泰斗才能进行融合。");
      return;
    }
    
    const mergedKnowledge: ExtractedKnowledge = {
      diseaseClassifications: Array.from(new Set(validMasters.flatMap(m => m.knowledge!.diseaseClassifications))),
      symptomMappings: validMasters.flatMap(m => m.knowledge!.symptomMappings),
      masterThoughts: Array.from(new Set(validMasters.flatMap(m => m.knowledge!.masterThoughts))),
    };

    const newId = Date.now().toString();
    setMasters(prev => [...prev, { 
      id: newId, 
      name: `融合泰斗 (${validMasters.length})`, 
      knowledge: mergedKnowledge 
    }]);
    setCurrentMasterId(newId);
    setActiveTab("tester");
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-stone-100 overflow-hidden font-sans relative flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-stone-900 text-white p-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-md text-white">
            <Menu size={18} className="opacity-0" /> {/* Placeholder for alignment if needed, or just use icon */}
          </div>
          <h1 className="text-base font-serif font-semibold tracking-wide">
            中医泰斗智能体
          </h1>
        </div>
        <button 
          className="p-1 hover:bg-stone-800 rounded-md transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        h-full
      `}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }}
          masters={masters}
          currentMasterId={currentMasterId}
          setCurrentMasterId={(id) => {
            setCurrentMasterId(id);
            setIsMobileMenuOpen(false);
          }}
          onCreateMaster={handleCreateMaster}
          onMergeMasters={handleMergeMasters}
        />
      </div>
      
      <main className="flex-1 overflow-hidden relative w-full">
        {activeTab === "extractor" ? (
          <KnowledgeExtractor 
            onKnowledgeExtracted={handleUpdateKnowledge} 
            master={currentMaster} 
            currentDoc={currentDocs[currentMasterId] || null}
            setCurrentDoc={handleSetCurrentDoc}
          />
        ) : (
          <AgentTester master={currentMaster} />
        )}
      </main>
    </div>
  );
}
