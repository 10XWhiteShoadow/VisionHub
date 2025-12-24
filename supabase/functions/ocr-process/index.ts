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
      systemPrompt = `You are an OCR text correction specialist. Your task is to:
1. Fix spelling mistakes and typos
2. Correct OCR errors (like 'l' misread as '1', 'O' as '0', etc.)
3. Fix missing or extra spaces
4. Preserve the original meaning and structure
5. Do NOT add any explanations, just output the corrected text.`;
      userPrompt = `Correct this OCR-extracted text:\n\n${text}`;
    } else if (action === "translate") {
      systemPrompt = `You are a professional translator. Translate the given text accurately to ${targetLanguage}. 
Only output the translation, no explanations or notes.`;
      userPrompt = `Translate to ${targetLanguage}:\n\n${text}`;
    } else if (action === "both") {
      systemPrompt = `You are an OCR text processor. Your task is to:
1. First, correct any spelling mistakes, typos, and OCR errors
2. Then translate the corrected text to ${targetLanguage}

Respond in this exact JSON format:
{"correctedText": "the corrected text here", "translatedText": "the translation here"}`;
      userPrompt = `Process this OCR text:\n\n${text}`;
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
        // Try to parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { correctedText: text, translatedText: content };
        }
      } catch {
        result = { correctedText: text, translatedText: content };
      }
    } else if (action === "correct") {
      result = { correctedText: content, translatedText: "" };
    } else {
      result = { correctedText: text, translatedText: content };
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
