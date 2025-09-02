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
    const { message, attachments = [], chatTone = "amigavel" } = await req.json();

    if (!message && attachments.length === 0) {
      throw new Error('Mensagem ou anexos são obrigatórios');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY não configurada');
    }

    // Definir estilo de resposta baseado no tom escolhido
    const toneInstructions = {
      objetivo: "Seja DIRETO e CONCISO. Use frases curtas, vá direto ao ponto, sem rodeios. Máximo 3-4 linhas por resposta.",
      explicativo: "Seja DETALHADO e EDUCATIVO. Explique o 'porquê' de cada estratégia, forneça contexto, exemplos práticos e fundamentos.",
      amigavel: "Seja CALOROSO e PRÓXIMO. Use um tom amistoso, empático, como se fosse um colega experiente dando conselhos.",
      simpatico: "Seja CARISMÁTICO e EMPÁTICO. Use humor sutil quando apropriado, demonstre entusiasmo e energia positiva.",
      profissional: "Seja FORMAL e TÉCNICO. Use linguagem corporativa, dados específicos, métricas e argumentos estruturados."
    };

    // Prompt especializado em vendas de SketchUp/TotalCAD
    let systemPrompt = `Você é um assistente especializado em vendas de software CAD, especificamente SketchUp, LayOut e produtos Trimble. 

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

TOM DE RESPOSTA ESCOLHIDO PELO USUÁRIO: ${toneInstructions[chatTone as keyof typeof toneInstructions] || toneInstructions.amigavel}

DIRETRIZES GERAIS:
- Use linguagem brasileira natural
- Seja prático e focado em vendas
- Ofereça scripts prontos quando apropriado
- Inclua emojis moderadamente para engajamento (exceto no tom profissional)
- Sempre termine com uma sugestão de próximo passo
- Adapte sua resposta ao tom escolhido acima

Responda sempre em português brasileiro com foco em vendas.`;

    // Processar anexos se houver
    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      systemPrompt += `\n\nCONTEXTO ADICIONAL: O usuário enviou ${attachments.length} arquivo(s). Analise o conteúdo e incorpore na sua resposta de vendas.`;
      
      for (const attachment of attachments) {
        if (attachment.type.startsWith('image/')) {
          // Para imagens, converter para base64 e incluir no prompt
          try {
            const response = await fetch(attachment.url);
            const arrayBuffer = await response.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            
            processedAttachments.push({
              type: 'image',
              data: `data:${attachment.type};base64,${base64}`,
              name: attachment.name
            });
          } catch (error) {
            console.error('Erro ao processar imagem:', error);
          }
        } else if (attachment.type === 'application/pdf') {
          systemPrompt += `\n\nPDF anexado: ${attachment.name} - Analise este documento e forneça insights de vendas relevantes.`;
        }
      }
    }

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
                { text: `Usuário: ${message || 'Usuário enviou anexos para análise'}` },
                ...processedAttachments.filter(att => att.type === 'image').map(att => ({
                  inline_data: {
                    mime_type: att.data.split(';')[0].split(':')[1],
                    data: att.data.split(',')[1]
                  }
                }))
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