import { ExtractedKnowledge } from "./services/geminiService";

export interface MasterAgent {
  id: string;
  name: string;
  knowledge: ExtractedKnowledge | null;
}
