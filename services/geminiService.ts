
import { GoogleGenAI, Type } from "@google/genai";
import { VideoConfig } from "../types";

// Helper to manage API Key selection
export const ensureApiKey = async (): Promise<boolean> => {
  // 1. If running in a standard env with env var set (exported app), allow it.
  if (process.env.API_KEY) return true;

  // 2. If running in AI Studio / IDX
  if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Re-check after opening dialog
        return await window.aistudio.hasSelectedApiKey();
      }
      return true;
  }
  
  return false;
};

export const promptSelectKey = async (): Promise<boolean> => {
    if (!window.aistudio) return false;
    await window.aistudio.openSelectKey();
    return true;
}

export const enhancePrompt = async (simplePrompt: string): Promise<string> => {
    if (!simplePrompt.trim()) return "";
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Rewrite the following prompt to be highly detailed, cinematic, and visual. 
            Keep it under 60 words. Focus on lighting, camera angle, and texture.
            Original: "${simplePrompt}"`,
        });
        return response.text || simplePrompt;
    } catch (e) {
        console.error("Enhance failed", e);
        return simplePrompt;
    }
};

export const generatePromptFromImage = async (base64Image: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                    { text: "Describe the visual style, subject, lighting, and camera angle of this image in a single paragraph (max 50 words). Write it as a prompt for a video/image generation model." }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        console.error("Prompt generation failed", e);
        throw e;
    }
};

export const generateImage = async (config: VideoConfig): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let finalPrompt = config.prompt;
    if (config.style && config.style !== 'None') {
        finalPrompt = `${config.style} style. ${finalPrompt}`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: finalPrompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: config.aspectRatio as any,
                }
            }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image data returned.");

    } catch (error) {
        console.error("Image generation failed:", error);
        throw error;
    }
}

export const generateVeoVideo = async (config: VideoConfig): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let finalPrompt = config.prompt;
  if (config.style && config.style !== 'None') {
    finalPrompt = `${config.style} style. ${finalPrompt}`;
  }

  // Ensure aspect ratio is supported by Veo (only 16:9 or 9:16)
  const veoAspectRatio = (config.aspectRatio === '16:9' || config.aspectRatio === '9:16') ? config.aspectRatio : '9:16';

  try {
    const payload: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: finalPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: veoAspectRatio,
      }
    };

    if (config.startImage) {
        payload.image = {
            imageBytes: config.startImage,
            mimeType: config.startImageMimeType || 'image/jpeg'
        };
    }

    let operation: any = await ai.models.generateVideos(payload);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
        throw new Error(operation.error.message || "Unknown error during video generation");
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("No video URI returned from API");
    }

    return videoUri;

  } catch (error: any) {
    console.error("Video generation failed:", error);
    if (error.message && error.message.includes("Requested entity was not found")) {
        throw new Error("API_KEY_INVALID");
    }
    throw error;
  }
};

export const analyzeVideoFrame = async (base64Frame: string): Promise<{title: string, description: string, viralScore: number, explanation: string, hashtags: string[]}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Remove header if present
    const cleanBase64 = base64Frame.split(',')[1] || base64Frame;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: cleanBase64
                        }
                    },
                    {
                        text: `Act as a Google Veo Vision Engine. Analyze this video frame based on cinematic standards (composition, lighting, motion blur, engagement).
                        
                        Strictly Output JSON with these fields:
                        1. title: A super clickbait/viral title (max 6 words).
                        2. description: One exciting sentence summarizing the action.
                        3. viralScore: An integer (0-100). Be strict. Only give >90 for perfect "Veo-quality" shots. Average shots should be 40-60.
                        4. explanation: 5-word reason for the rank (e.g. "Perfect lighting and composition").
                        5. hashtags: 5 relevant tags.`
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        viralScore: { type: Type.NUMBER },
                        explanation: { type: Type.STRING },
                        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text);

    } catch (error) {
        console.error("Frame analysis failed:", error);
        return {
            title: "Clip Analysis Failed",
            description: "Could not analyze this specific frame.",
            viralScore: 0,
            explanation: "AI Error",
            hashtags: ["#error"]
        };
    }
}

export const fetchAuthenticatedVideoUrl = async (uri: string): Promise<string> => {
    try {
        const key = process.env.API_KEY || '';
        const response = await fetch(`${uri}&key=${key}`);
        if (!response.ok) throw new Error("Failed to download video");
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Error fetching video blob:", e);
        return uri;
    }
}

export const shareVideo = async (videoUrl: string, title: string): Promise<void> => {
    try {
        // Fetch the blob from the blob URL
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        
        // Create a File object
        const file = new File([blob], `${title.replace(/\s+/g, '-').toLowerCase()}.mp4`, { type: 'video/mp4' });

        // Check if sharing is supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: title,
                text: `${title} - Created with InstaSplit AI #instasplit #ai`,
            });
        } else {
            throw new Error("Sharing not supported on this device/browser.");
        }
    } catch (error) {
        console.error("Share failed:", error);
        throw error;
    }
};
