import { X, Database, BookOpen, Activity, Lightbulb } from "lucide-react";
import { ExtractedKnowledge } from "@/services/geminiService";

interface KnowledgeViewerModalProps {
  knowledge: ExtractedKnowledge;
  masterName: string;
  onClose: () => void;
}

export function KnowledgeViewerModal({ knowledge, masterName, onClose }: KnowledgeViewerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-medium text-stone-900">【{masterName}】完整知识库</h2>
              <p className="text-sm text-stone-500">已提取的结构化诊疗逻辑</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {/* Disease Classifications */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-medium text-stone-900 mb-4 pb-2 border-b border-stone-100">
              <BookOpen size={18} className="text-emerald-600" />
              疾病分类 ({knowledge.diseaseClassifications?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {knowledge.diseaseClassifications?.map((disease, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-sm border border-stone-200">
                  {disease}
                </span>
              ))}
              {(!knowledge.diseaseClassifications || knowledge.diseaseClassifications.length === 0) && (
                <p className="text-stone-500 text-sm italic">暂无数据</p>
              )}
            </div>
          </section>

          {/* Symptom Mappings */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-medium text-stone-900 mb-4 pb-2 border-b border-stone-100">
              <Activity size={18} className="text-emerald-600" />
              症方映射 ({knowledge.symptomMappings?.length || 0})
            </h3>
            <div className="space-y-4">
              {knowledge.symptomMappings?.map((mapping, idx) => (
                <div key={idx} className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-md">
                      {mapping.disease || "未分类"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1">症状</span>
                      <p className="text-sm text-stone-800">{mapping.symptoms?.join("、") || "N/A"}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1">舌象</span>
                        <p className="text-sm text-stone-800">{mapping.tongue || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1">脉象</span>
                        <p className="text-sm text-stone-800">{mapping.pulse || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1">证型</span>
                      <p className="text-sm font-medium text-emerald-700">{mapping.syndrome || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1">治法</span>
                      <p className="text-sm text-stone-800">{mapping.treatmentPrinciple || "N/A"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-1">方剂</span>
                      <p className="text-sm font-medium text-stone-900 bg-white border border-stone-200 px-3 py-2 rounded-lg inline-block">
                        {mapping.prescription || "N/A"}
                      </p>
                    </div>
                    {mapping.modifications && mapping.modifications.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2">加减法</span>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                          {mapping.modifications.map((mod, i) => (
                            <li key={i}>{mod}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {mapping.associatedThoughts && mapping.associatedThoughts.length > 0 && (
                      <div className="md:col-span-2 mt-2 pt-4 border-t border-stone-200/60">
                        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                          <Lightbulb size={12} /> 关联心法
                        </span>
                        <ul className="space-y-2">
                          {mapping.associatedThoughts.map((thought, i) => (
                            <li key={i} className="text-xs text-stone-600 bg-stone-100/50 px-3 py-2 rounded-lg border border-stone-100">
                              "{thought}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!knowledge.symptomMappings || knowledge.symptomMappings.length === 0) && (
                <p className="text-stone-500 text-sm italic">暂无数据</p>
              )}
            </div>
          </section>

          {/* Master Thoughts */}
          <section>
            <h3 className="flex items-center gap-2 text-lg font-medium text-stone-900 mb-4 pb-2 border-b border-stone-100">
              <Lightbulb size={18} className="text-emerald-600" />
              核心诊疗心法 ({knowledge.masterThoughts?.length || 0})
            </h3>
            <ul className="space-y-3">
              {knowledge.masterThoughts?.map((thought, idx) => (
                <li key={idx} className="flex items-start gap-3 bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-stone-700 leading-relaxed">{thought}</p>
                </li>
              ))}
              {(!knowledge.masterThoughts || knowledge.masterThoughts.length === 0) && (
                <p className="text-stone-500 text-sm italic">暂无数据</p>
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
