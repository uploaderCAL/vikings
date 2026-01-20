
import { GoogleGenAI } from "@google/genai";

// Fix: Ensure the API key is passed exactly as specified in the guidelines using the direct named parameter
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getChatIcebreaker = async (nickname: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma saudação curta, educada e amigável para iniciar uma conversa com "${nickname}" em um evento social. Sem referências a temas específicos. Máximo 10 palavras.`,
    });
    return response.text?.trim() || "Olá! Tudo bem?";
  } catch (error) {
    return "Olá! Como está sua noite?";
  }
};

export const generateShutdownMessage = async (minutes: number) => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Gere um aviso curto informando que o sistema social será encerrado em ${minutes} minutos. Tom profissional e direto.`,
    });
    return response.text?.trim() || `O sistema será encerrado em ${minutes} minutos.`;
  } catch (error) {
    return `O sistema será encerrado em ${minutes} minutos.`;
  }
}