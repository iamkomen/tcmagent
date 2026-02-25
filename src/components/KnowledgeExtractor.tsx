import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileText, CheckCircle2, Loader2, Database, BrainCircuit, File as FileIcon, Download, Plus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractKnowledgeFromDocument, ExtractedKnowledge } from "@/services/geminiService";
import { MasterAgent } from "@/types";
import * as mammoth from "mammoth";
import { CurrentDoc } from "@/App";
import { KnowledgeViewerModal } from "./KnowledgeViewerModal";

interface KnowledgeExtractorProps {
  onKnowledgeExtracted: (knowledge: ExtractedKnowledge) => void;
  master: MasterAgent;
  currentDoc: CurrentDoc | null;
  setCurrentDoc: (doc: CurrentDoc | null) => void;
}

export function KnowledgeExtractor({ onKnowledgeExtracted, master, currentDoc, setCurrentDoc }: KnowledgeExtractorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isContinuingExtraction, setIsContinuingExtraction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const knowledge = master.knowledge;

  // Clear selected file when switching masters
  useEffect(() => {
    setSelectedFile(null);
    setError(null);
  }, [master.id]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleGenerateAgent = async (isContinuing = false) => {
    let base64String = "";
    let mimeType = "";
    let docName = "";

    if (isContinuing && currentDoc) {
      base64String = currentDoc.base64;
      mimeType = currentDoc.mimeType;
      docName = currentDoc.name;
    } else if (selectedFile) {
      if (selectedFile.size > 15 * 1024 * 1024) {
        setError("文件过大，请上传小于 15MB 的文件。");
        return;
      }

      const isDocx = selectedFile.name.toLowerCase().endsWith('.docx');
      const isDoc = selectedFile.name.toLowerCase().endsWith('.doc');

      if (isDoc) {
        setError("暂不支持 .doc 格式，请将其另存为 .docx 格式后重新上传。");
        return;
      }

      try {
        if (isDocx) {
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(selectedFile);
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(new Error("读取文件失败。"));
          });
          
          const extractRawText = mammoth.extractRawText || (mammoth as any).default?.extractRawText;
          if (!extractRawText) {
            throw new Error("无法加载 DOCX 解析库。");
          }
          const result = await extractRawText({ arrayBuffer });
          const text = result.value;
          
          // Use FileReader to efficiently encode large text to base64
          const blob = new Blob([text], { type: 'text/plain' });
          base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => {
              const res = reader.result as string;
              resolve(res.split(",")[1]);
            };
            reader.onerror = () => reject(new Error("Base64 编码失败。"));
          });
          mimeType = 'text/plain';
        } else {
          base64String = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]);
            };
            reader.onerror = () => reject(new Error("读取文件失败。"));
          });
          
          mimeType = selectedFile.type;
          if (!mimeType) {
            if (selectedFile.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
            else if (selectedFile.name.toLowerCase().endsWith('.txt')) mimeType = 'text/plain';
            else mimeType = 'application/pdf';
          }
        }
      } catch (err: any) {
        setError(err.message || "处理文件失败。");
        return;
      }

      docName = selectedFile.name;
    } else {
      setError("请先选择要上传的文件。");
      return;
    }

    setError(null);
    setIsExtracting(true);
    setIsContinuingExtraction(isContinuing || !!knowledge);

    try {
      const extracted = await extractKnowledgeFromDocument(
        base64String, 
        mimeType, 
        knowledge || undefined
      );
      onKnowledgeExtracted(extracted);
      setCurrentDoc({ base64: base64String, mimeType, name: docName });
      setSelectedFile(null);
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(err.message || "提取过程中发生错误。文件可能过大或 API 请求超时。");
    } finally {
      setIsExtracting(false);
      setIsContinuingExtraction(false);
    }
  };

  const handleExport = () => {
    if (!knowledge) return;
    try {
      const blob = new Blob([JSON.stringify(knowledge, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${master.name.replace(/\s+/g, '-').toLowerCase()}-agent.json`;
      // Append to body to ensure click works in all browsers/iframes
      document.body.appendChild(a);
      a.click();
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setError("导出失败，请重试。");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif font-medium text-stone-900 mb-2">医案知识提取</h2>
          <p className="text-stone-500 text-sm md:text-base">为<strong className="text-stone-800">【{master.name}】</strong>提取并构建核心诊疗逻辑。</p>
        </div>
        {knowledge && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setIsViewerOpen(true)} 
              className="flex-1 sm:flex-none flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-4 py-2 md:px-5 md:py-2.5 rounded-xl hover:bg-stone-50 transition-colors text-sm font-medium shadow-sm justify-center"
            >
              <Eye size={18} />
              查看完整知识库
            </button>
            <button 
              onClick={handleExport} 
              className="flex-1 sm:flex-none flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 md:px-5 md:py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm justify-center"
            >
              <Download size={18} />
              导出智能体 (JSON)
            </button>
          </div>
        )}
      </div>

      {isViewerOpen && knowledge && (
        <KnowledgeViewerModal 
          knowledge={knowledge} 
          masterName={master.name} 
          onClose={() => setIsViewerOpen(false)} 
        />
      )}

      {knowledge && !isExtracting && !selectedFile && (
        <div className="space-y-6 mb-12">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start gap-4">
            <div className="bg-emerald-100 p-2 rounded-full text-emerald-600 mt-1">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-emerald-900 mb-1">智能体知识库已生成</h3>
              <p className="text-emerald-700 text-sm">泰斗的诊疗逻辑已成功提取并结构化。您可以在左侧边栏切换到「智能体诊疗测试」进行验证，或点击右上角导出。</p>
            </div>
          </div>

          {currentDoc && knowledge.hasMoreContent !== false && (
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-stone-900 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-600" />
                  继续从当前文档提取
                </h4>
                <p className="text-sm text-stone-500 mt-1">当前文档：<span className="font-medium text-stone-700">{currentDoc.name}</span></p>
                <p className="text-xs text-stone-400 mt-1">由于单次提取数量有限（防止超时），您可以点击右侧按钮继续提取文档中的剩余医案。</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateAgent(true)}
                  className="shrink-0 bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <BrainCircuit size={16} />
                  继续提取剩余内容
                </button>
                <button
                  onClick={() => setCurrentDoc(null)}
                  className="shrink-0 bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium"
                  title="清除当前文档缓存"
                >
                  清除
                </button>
              </div>
            </div>
          )}

          {currentDoc && knowledge.hasMoreContent === false && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 shadow-sm flex items-start gap-4">
              <div className="bg-stone-200 p-2 rounded-full text-stone-600 mt-1">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-stone-900">当前文档已提取完毕</h4>
                <p className="text-sm text-stone-500 mt-1">文档 <span className="font-medium text-stone-700">{currentDoc.name}</span> 中的所有有效中医知识均已提取并融合到知识库中。</p>
                <button
                  onClick={() => setCurrentDoc(null)}
                  className="mt-3 bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  上传新文档
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Database size={18} className="text-stone-400" />
                <h4 className="font-medium text-stone-900">知识库统计</h4>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between items-center py-2 border-b border-stone-100">
                  <span className="text-stone-500">疾病分类数量</span>
                  <span className="font-mono font-medium text-stone-900">{knowledge.diseaseClassifications?.length || 0}</span>
                </li>
                <li className="flex justify-between items-center py-2 border-b border-stone-100">
                  <span className="text-stone-500">症方映射数量</span>
                  <span className="font-mono font-medium text-stone-900">{knowledge.symptomMappings?.length || 0}</span>
                </li>
                <li className="flex justify-between items-center py-2 border-b border-stone-100">
                  <span className="text-stone-500">核心诊疗心法</span>
                  <span className="font-mono font-medium text-stone-900">{knowledge.masterThoughts?.length || 0}</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-stone-400" />
                <h4 className="font-medium text-stone-900">映射示例</h4>
              </div>
              {knowledge.symptomMappings && knowledge.symptomMappings.length > 0 ? (
                <div className="bg-stone-50 p-4 rounded-xl text-xs font-mono text-stone-600 overflow-y-auto flex-1">
                  <div className="space-y-2">
                    <p><span className="text-emerald-600 font-semibold">所属疾病：</span> {knowledge.symptomMappings[0].disease || "未分类"}</p>
                    <p><span className="text-emerald-600 font-semibold">症状：</span> {knowledge.symptomMappings[0].symptoms?.join(", ") || "N/A"}</p>
                    <p><span className="text-emerald-600 font-semibold">舌象：</span> {knowledge.symptomMappings[0].tongue || "N/A"}</p>
                    <p><span className="text-emerald-600 font-semibold">脉象：</span> {knowledge.symptomMappings[0].pulse || "N/A"}</p>
                    <p><span className="text-emerald-600 font-semibold">证型：</span> {knowledge.symptomMappings[0].syndrome || "N/A"}</p>
                    <p><span className="text-emerald-600 font-semibold">治法：</span> {knowledge.symptomMappings[0].treatmentPrinciple || "N/A"}</p>
                    <p><span className="text-emerald-600 font-semibold">方剂：</span> {knowledge.symptomMappings[0].prescription || "N/A"}</p>
                    <p><span className="text-emerald-600 font-semibold">加减：</span></p>
                    <ul className="list-disc pl-4">
                      {knowledge.symptomMappings[0].modifications?.map((mod, i) => (
                        <li key={i}>{mod}</li>
                      ))}
                    </ul>
                    {knowledge.symptomMappings[0].associatedThoughts && knowledge.symptomMappings[0].associatedThoughts.length > 0 && (
                      <p className="mt-2 pt-2 border-t border-stone-200/60">
                        <span className="text-emerald-600 font-semibold">关联心法：</span> 
                        {knowledge.symptomMappings[0].associatedThoughts[0].substring(0, 30)}...
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-stone-500">未提取到映射关系。</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!isExtracting && !selectedFile && (
        <div>
          <h3 className="text-lg font-medium text-stone-900 mb-4">
            {knowledge ? "上传新文献以补充知识库" : "上传中医文献"}
          </h3>
          <div
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer",
              isDragging ? "border-emerald-500 bg-emerald-50" : "border-stone-300 hover:border-emerald-400 hover:bg-stone-50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-stone-100">
              <UploadCloud className="text-emerald-600" size={28} />
            </div>
            <p className="text-sm text-stone-500 mb-4">
              将 PDF、TXT 或 DOCX 文件拖拽至此，或点击浏览
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-stone-400 font-mono">
              <span>PDF</span>
              <span>•</span>
              <span>TXT</span>
              <span>•</span>
              <span>DOCX</span>
            </div>
          </div>
        </div>
      )}

      {!isExtracting && selectedFile && (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-stone-100 p-3 rounded-xl text-stone-600">
                <FileIcon size={24} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-stone-900">{selectedFile.name}</h3>
                <p className="text-sm text-stone-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-sm text-stone-500 hover:text-stone-700 underline"
            >
              更换文件
            </button>
          </div>
          
          <div className="bg-stone-50 rounded-xl p-4 mb-6 border border-stone-100">
            <h4 className="text-sm font-medium text-stone-900 mb-2">提取流程预览：</h4>
            <ul className="text-sm text-stone-600 space-y-2">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-stone-400" /> 解析章节、段落与中医术语</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-stone-400" /> 提取疾病分类与辨证逻辑</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-stone-400" /> 构建「症-舌-脉-方」映射关系</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-stone-400" /> 提炼泰斗独家诊疗心法</li>
            </ul>
          </div>

          <button
            onClick={() => handleGenerateAgent(false)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <BrainCircuit size={18} />
            {knowledge ? "提取并融合知识" : "生成智能体"}
          </button>
        </div>
      )}

      {isExtracting && (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-stone-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
              <BrainCircuit size={24} />
            </div>
          </div>
          <h3 className="text-xl font-medium text-stone-900 mb-2">
            {isContinuingExtraction ? "正在继续提取并融合知识..." : "正在分析中医文献..."}
          </h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            {isContinuingExtraction 
              ? "正在扫描文档中尚未提取的疾病分类、症方映射及诊疗心法，并与现有知识库合并。"
              : "正在提取疾病分类、症方映射及泰斗独家诊疗心法，这可能需要一分钟左右。"}
          </p>
          
          <div className="mt-8 max-w-sm mx-auto space-y-3 text-left">
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              <span>{isContinuingExtraction ? "扫描新的诊疗模式" : "解析文档结构"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              <span>{isContinuingExtraction ? "提取更多映射关系" : "提取症状-证型映射"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-600">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
              <span>{isContinuingExtraction ? "与现有知识库无缝融合" : "构建规则知识图谱"}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <strong>错误：</strong> {error}
          <button 
            onClick={() => setError(null)}
            className="ml-4 underline hover:text-red-900"
          >
            忽略
          </button>
        </div>
      )}
    </div>
  );
}
