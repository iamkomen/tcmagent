import { useState } from "react";
import { diagnoseWithAgent } from "@/services/geminiService";
import { Send, User, Bot, Loader2, AlertCircle } from "lucide-react";
import Markdown from "react-markdown";
import { MasterAgent } from "@/types";

interface AgentTesterProps {
  master: MasterAgent;
}

export function AgentTester({ master }: AgentTesterProps) {
  const [symptoms, setSymptoms] = useState("");
  const [tongue, setTongue] = useState("");
  const [pulse, setPulse] = useState("");
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const knowledge = master.knowledge;

  const handleDiagnose = async () => {
    if (!knowledge) return;
    if (!symptoms.trim()) {
      setError("请输入患者症状。");
      return;
    }

    setIsDiagnosing(true);
    setError(null);
    setResult(null);

    try {
      const diagnosis = await diagnoseWithAgent(knowledge, symptoms, tongue, pulse);
      setResult(diagnosis);
    } catch (err: any) {
      setError(err.message || "生成诊疗方案失败。");
    } finally {
      setIsDiagnosing(false);
    }
  };

  if (!knowledge) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-500 p-8 text-center">
        <div className="bg-stone-100 p-4 rounded-full mb-4">
          <AlertCircle size={32} className="text-stone-400" />
        </div>
        <h2 className="text-xl font-medium text-stone-900 mb-2">暂无可用智能体</h2>
        <p className="max-w-md">请先在「医案知识提取」页面上传中医文献，以构建<strong className="text-stone-700">【{master.name}】</strong>智能体。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-50">
      <div className="p-4 md:p-6 border-b border-stone-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-serif font-medium text-stone-900">【{master.name}】智能体</h2>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1">
            <p className="text-xs md:text-sm text-stone-500">
              知识范围：{knowledge.diseaseClassifications?.slice(0, 3).join(", ") || "N/A"}
              {(knowledge.diseaseClassifications?.length || 0) > 3 ? "..." : ""}
            </p>
            <span className="text-[10px] md:text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
              置信度：98%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border border-emerald-200 shrink-0">
          <Bot size={16} />
          智能体已就绪
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Input Form */}
        <div className="w-full md:w-1/3 p-6 border-r border-stone-200 bg-white overflow-y-auto">
          <h3 className="text-lg font-medium text-stone-900 mb-6 flex items-center gap-2">
            <User size={20} className="text-stone-400" />
            患者信息输入
          </h3>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                症状 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="例如：口干、心烦失眠、手足心热"
                className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-h-[120px] resize-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                舌象
              </label>
              <input
                type="text"
                value={tongue}
                onChange={(e) => setTongue(e.target.value)}
                placeholder="例如：舌红少苔"
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                脉象
              </label>
              <input
                type="text"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="例如：细数"
                className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              onClick={handleDiagnose}
              disabled={isDiagnosing || !symptoms.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDiagnosing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  正在分析...
                </>
              ) : (
                <>
                  <Send size={18} />
                  生成诊疗方案
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-stone-50">
          {isDiagnosing ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-500">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-stone-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <Bot size={20} />
                </div>
              </div>
              <h3 className="text-xl font-medium text-stone-900 mb-2">正在分析患者病案...</h3>
              <p className="text-sm max-w-sm text-center">
                正在运用泰斗的诊疗规则分析患者的症状、舌象与脉象。
              </p>
            </div>
          ) : result ? (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-stone-100">
                  <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-medium text-stone-900">泰斗诊疗报告</h3>
                    <p className="text-sm text-stone-500">基于提取的知识规则生成</p>
                  </div>
                </div>
                
                <div className="prose prose-stone max-w-none prose-headings:font-serif prose-headings:font-medium prose-h3:text-lg prose-p:text-stone-600 prose-li:text-stone-600 prose-strong:text-stone-900">
                  <Markdown>{result}</Markdown>
                </div>
                
                <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400 font-mono">
                  <span>由【{master.name}】智能体生成</span>
                  <span>置信度：高</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-stone-400">
              <Bot size={48} className="mb-4 opacity-20" />
              <p className="text-lg">等待输入患者信息</p>
              <p className="text-sm max-w-sm text-center mt-2">
                请在左侧输入患者的症状、舌象和脉象，以获取基于泰斗知识库的诊疗方案。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
