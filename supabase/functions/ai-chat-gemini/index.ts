import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      throw new Error('Mensagem é obrigatória');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY não configurada');
    }

    // Prompt especializado em vendas de SketchUp/TotalCAD
    const systemPrompt = `Você é um assistente especializado em vendas de software CAD, especificamente SketchUp, LayOut e produtos Trimble. 

Seu objetivo é ajudar vendedores brasileiros a:
- Superar objeções de preço
- Criar scripts de renovação eficazes  
- Desenvolver estratégias de follow-up
- Apresentar valor dos produtos CAD
- Responder dúvidas técnicas de vendas
- Gerar templates de email e WhatsApp

CONTEXTO DOS PRODUTOS:
- SketchUp Pro: Software de modelagem 3D para arquitetura, design e engenharia
- LayOut: Para documentação técnica e apresentações  
- Trimble Connect: Colaboração em nuvem
- Principais concorrentes: AutoCAD, Revit, ArchiCAD

OBJEÇÕES COMUNS:
- "Muito caro"
- "Já temos outro software" 
- "Usamos pouco"
- "Não temos orçamento agora"
- "Vamos avaliar outras opções"

DIRETRIZES:
- Use linguagem brasileira natural
- Seja prático e focado em vendas
- Ofereça scripts prontos quando apropriado
- Mantenha tom consultivo mas assertivo
- Inclua emojis moderadamente para engajamento
- Sempre termine com uma sugestão de próximo passo

Responda sempre em português brasileiro com foco em vendas.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: `Usuário: ${message}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH", 
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro da API Gemini:', response.status, errorData);
      throw new Error(`Erro da API Gemini: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Nenhuma resposta gerada pelo Gemini');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erro na função ai-chat-gemini:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});