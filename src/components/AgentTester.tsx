import { useState, useRef, useEffect } from "react";
import { diagnoseWithAgent } from "@/services/geminiService";
import { Send, User, Bot, Loader2, AlertCircle, Trash2 } from "lucide-react";
import Markdown from "react-markdown";
import { MasterAgent } from "@/types";
import { cn } from "@/lib/utils";

interface AgentTesterProps {
  master: MasterAgent;
}

interface Message {
  role: "user" | "agent";
  content: string;
}

export function AgentTester({ master }: AgentTesterProps) {
  const [input, setInput] = useState("");
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const knowledge = master.knowledge;

  // Clear chat when switching masters
  useEffect(() => {
    setMessages([]);
  }, [master.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isDiagnosing]);

  const handleSend = async () => {
    if (!knowledge || !input.trim() || isDiagnosing) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsDiagnosing(true);

    try {
      const diagnosis = await diagnoseWithAgent(knowledge, userMsg);
      setMessages(prev => [...prev, { role: "agent", content: diagnosis }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "agent", content: `**错误：** ${err.message || "生成诊疗方案失败。"}` }]);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!knowledge) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-500 p-8 text-center bg-stone-50">
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
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-stone-200 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
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
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={() => setMessages([])}
              className="text-stone-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
              title="清空对话"
            >
              <Trash2 size={18} />
            </button>
          )}
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border border-emerald-200 shrink-0">
            <Bot size={16} />
            智能体已就绪
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400">
            <Bot size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-stone-600">我是【{master.name}】的数字分身</p>
            <p className="text-sm max-w-md text-center mt-2 leading-relaxed">
              我已经学习了该泰斗的诊疗心法和医案。请在下方输入患者的详细病案（包括症状、舌象、脉象等），我将为您提供辨证分析和处方建议。
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex gap-4 max-w-4xl mx-auto",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                msg.role === "user" ? "bg-stone-200 text-stone-600" : "bg-emerald-100 text-emerald-600"
              )}>
                {msg.role === "user" ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={cn(
                "px-5 py-4 rounded-2xl max-w-[85%]",
                msg.role === "user" 
                  ? "bg-stone-900 text-white rounded-tr-sm" 
                  : "bg-white border border-stone-200 shadow-sm rounded-tl-sm prose prose-stone prose-sm md:prose-base max-w-none prose-headings:font-serif prose-headings:font-medium prose-h3:text-lg prose-p:text-stone-600 prose-li:text-stone-600 prose-strong:text-stone-900"
              )}>
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap text-sm md:text-base">{msg.content}</p>
                ) : (
                  <Markdown>{msg.content}</Markdown>
                )}
              </div>
            </div>
          ))
        )}
        
        {isDiagnosing && (
          <div className="flex gap-4 max-w-4xl mx-auto flex-row">
            <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div className="px-5 py-4 rounded-2xl bg-white border border-stone-200 shadow-sm rounded-tl-sm flex items-center gap-3 text-stone-500">
              <Loader2 size={18} className="animate-spin text-emerald-500" />
              <span className="text-sm">正在运用泰斗心法辨证...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white border-t border-stone-200 shrink-0">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入患者病案（如：男，45岁，头痛发热，口干心烦，舌红少苔，脉细数...）"
            className="w-full rounded-2xl border border-stone-300 pl-5 pr-14 py-4 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-h-[60px] max-h-[200px] resize-none custom-scrollbar"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={isDiagnosing || !input.trim()}
            className="absolute right-3 bottom-3 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-xs text-stone-400 mt-3">
          Shift + Enter 换行，Enter 发送。AI 诊疗结果仅供参考，不能替代专业医师诊断。
        </p>
      </div>
    </div>
  );
}
