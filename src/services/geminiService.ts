import { GoogleGenAI, Type } from "@google/genai";

const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 GEMINI_API_KEY 环境变量");
  }
  return new GoogleGenAI({ apiKey });
};

export interface ExtractedKnowledge {
  diseaseClassifications: string[];
  symptomMappings: {
    symptoms: string[];
    tongue: string;
    pulse: string;
    syndrome: string;
    treatmentPrinciple: string;
    prescription: string;
    modifications: string[];
  }[];
  masterThoughts: string[];
}

export const extractKnowledgeFromDocument = async (
  base64Data: string,
  mimeType: string,
  previousKnowledge?: ExtractedKnowledge
): Promise<ExtractedKnowledge> => {
  const ai = getAi();
  
  let prompt = `
    You are an expert in Traditional Chinese Medicine (TCM).
    Analyze the provided document (which is a TCM text or case study collection from a master).
    Extract the following structured knowledge.
    
    CRITICAL INSTRUCTION: To prevent output truncation, you MUST extract only a BATCH of information in this turn:
    1. Disease Classifications: Extract up to 15 disease classifications.
    2. Symptom Mappings: Extract up to 10 detailed mappings of symptoms, tongue appearance, pulse, the corresponding syndrome (证型), treatment principle (治法), base prescription (方剂), and specific modifications based on symptoms (加减).
    3. Master's Thoughts: Extract up to 10 unique diagnostic thoughts, principles, or rules from this specific master.
    
    Return the output strictly as JSON matching the requested schema. Ensure the extracted data is highly detailed and specific to the text provided, not just generic TCM knowledge.
  `;

  if (previousKnowledge) {
    prompt += `
    
    IMPORTANT: You have already extracted some knowledge from this master. 
    DO NOT repeat the following previously extracted knowledge. Focus ONLY on finding NEW disease classifications, symptom mappings, and master's thoughts that are NOT in this list:
    
    Previously Extracted Disease Classifications: ${JSON.stringify(previousKnowledge.diseaseClassifications)}
    Previously Extracted Symptom Mappings (Syndromes): ${JSON.stringify(previousKnowledge.symptomMappings.map(m => m.syndrome))}
    Previously Extracted Master's Thoughts: ${JSON.stringify(previousKnowledge.masterThoughts)}
    
    Extract a NEW BATCH of up to 15 disease classifications, 10 symptom mappings, and 10 master's thoughts from the document that haven't been covered yet.
    `;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diseaseClassifications: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          symptomMappings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symptoms: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                tongue: { type: Type.STRING },
                pulse: { type: Type.STRING },
                syndrome: { type: Type.STRING },
                treatmentPrinciple: { type: Type.STRING },
                prescription: { type: Type.STRING },
                modifications: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["symptoms", "tongue", "pulse", "syndrome", "treatmentPrinciple", "prescription", "modifications"],
            },
          },
          masterThoughts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["diseaseClassifications", "symptomMappings", "masterThoughts"],
      },
    },
  });

  let text = "";
  try {
    text = response.text || "";
  } catch (e) {
    console.error("Error accessing response text:", e);
    throw new Error("模型响应被拦截或为空，请尝试更换文档内容。");
  }

  if (!text) throw new Error("未收到 Gemini 的响应");
  
  // Clean up potential markdown formatting
  text = text.trim();
  if (text.startsWith("```json")) {
    text = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (text.startsWith("```")) {
    text = text.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(text) as Partial<ExtractedKnowledge>;
    
    // Ensure arrays exist and filter out any null/undefined items
    const newKnowledge = {
      diseaseClassifications: Array.isArray(parsed.diseaseClassifications) ? parsed.diseaseClassifications.filter(Boolean) : [],
      symptomMappings: Array.isArray(parsed.symptomMappings) ? parsed.symptomMappings.filter(Boolean) : [],
      masterThoughts: Array.isArray(parsed.masterThoughts) ? parsed.masterThoughts.filter(Boolean) : [],
    };

    if (previousKnowledge) {
      // Merge new knowledge with previous knowledge
      return {
        diseaseClassifications: Array.from(new Set([...(previousKnowledge.diseaseClassifications || []), ...newKnowledge.diseaseClassifications])),
        symptomMappings: [...(previousKnowledge.symptomMappings || []), ...newKnowledge.symptomMappings],
        masterThoughts: Array.from(new Set([...(previousKnowledge.masterThoughts || []), ...newKnowledge.masterThoughts])),
      };
    }

    return newKnowledge;
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error("解析提取的知识失败。文档可能过于复杂，或者单次提取量过大导致响应被截断。");
  }
};

export const diagnoseWithAgent = async (
  knowledge: ExtractedKnowledge,
  patientSymptoms: string,
  patientTongue: string,
  patientPulse: string
): Promise<string> => {
  const ai = getAi();
  
  const systemInstruction = `
    You are an AI Agent embodying the knowledge of a specific Traditional Chinese Medicine master.
    You MUST base your diagnosis and prescription strictly on the provided Extracted Knowledge Base.
    Do not use generic TCM knowledge if it contradicts the master's specific rules.
    
    Extracted Knowledge Base:
    ${JSON.stringify(knowledge, null, 2)}
    
    IMPORTANT: You MUST provide your response entirely in Chinese (简体中文).
    
    Format your response as follows using Markdown:
    ### 1. 辨证过程 (Diagnostic Process)
    Explain the reasoning based on the symptoms, tongue, and pulse, mapping them to the knowledge base.
    
    ### 2. 建议方案 (Suggested Plan)
    State the treatment principle (治法), base prescription (方剂), and specific modifications (加减).
    
    ### 3. 书中依据 (Source Reference)
    Cite the relevant "Master's Thoughts" or specific mappings from the knowledge base that justify this decision.
  `;

  const prompt = `
    患者症状 (Patient Symptoms): ${patientSymptoms}
    患者舌象 (Patient Tongue): ${patientTongue}
    患者脉象 (Patient Pulse): ${patientPulse}
    
    请基于泰斗的知识库提供诊疗方案。 (Please provide a diagnosis and prescription based on the master's knowledge.)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction,
    },
  });

  return response.text || "未能生成诊疗方案。";
};
