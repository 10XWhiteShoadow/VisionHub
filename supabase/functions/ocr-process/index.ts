import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ 
        correctedText: "", 
        translatedText: "" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "correct") {
      systemPrompt = `You are an expert OCR text correction AI. Your ONLY job is to fix OCR errors.

COMMON OCR MISTAKES TO FIX:
- Character confusion: l/1/I, O/0, S/5, B/8, rn/m, cl/d, vv/w
- Missing/extra spaces between words
- Broken words across lines
- Punctuation errors (.  , ' " - etc.)
- Case errors from misrecognition

RULES:
1. Output ONLY the corrected text - no explanations, no notes, no quotes
2. Preserve original formatting (paragraphs, line breaks) 
3. If text is gibberish, try to infer the most likely intended words
4. Keep proper nouns and technical terms intact when clear`;
      userPrompt = `Fix all OCR errors in this text and output only the corrected version:\n\n${text}`;
    } else if (action === "translate") {
      systemPrompt = `You are a professional translator. Translate accurately to ${targetLanguage}.
Output ONLY the translation - no explanations, no original text, no notes.`;
      userPrompt = `Translate to ${targetLanguage}:\n\n${text}`;
    } else if (action === "both") {
      systemPrompt = `You are an OCR correction and translation AI.

STEP 1 - Fix OCR errors:
- Fix character confusion (l/1/I, O/0, rn/m, etc.)
- Fix spacing issues
- Correct obvious typos and misrecognitions

STEP 2 - Translate the corrected text to ${targetLanguage}

CRITICAL: You MUST respond with ONLY valid JSON in this exact format:
{"correctedText": "the corrected English text", "translatedText": "the ${targetLanguage} translation"}

No markdown, no code blocks, no explanations - JUST the JSON object.`;
      userPrompt = `OCR text to correct and translate:\n\n${text}`;
    }

    console.log(`Processing OCR text with action: ${action}, target language: ${targetLanguage}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    console.log("AI response received:", content.substring(0, 100));

    let result;
    if (action === "both") {
      try {
        // Clean markdown code blocks if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        } else if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }
        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }
        cleanContent = cleanContent.trim();
        
        // Try to parse JSON response
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
          // Validate required fields exist
          if (!result.correctedText) result.correctedText = text;
          if (!result.translatedText) result.translatedText = "";
        } else {
          // If no JSON found, treat entire response as translation
          console.warn("No JSON found in response, using fallback");
          result = { correctedText: text, translatedText: cleanContent };
        }
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
        // Fallback: try to extract text intelligently
        const lines = content.split('\n').filter((l: string) => l.trim());
        result = { 
          correctedText: text, 
          translatedText: lines.length > 0 ? lines[lines.length - 1] : content 
        };
      }
    } else if (action === "correct") {
      // Strip any quotes or formatting
      let cleaned = content.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      result = { correctedText: cleaned, translatedText: "" };
    } else {
      let cleaned = content.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      result = { correctedText: text, translatedText: cleaned };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("OCR process error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
