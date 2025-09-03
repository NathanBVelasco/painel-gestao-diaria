import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { message, attachments, chatTone } = await req.json();

    if (!message && (!attachments || attachments.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Message or attachments are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    let userId = null;
    let userPreferences = null;
    let softwareKnowledge = [];

    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = user?.id;

        if (userId) {
          // Get user AI preferences
          const { data: preferences } = await supabase
            .from('ai_chat_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

          userPreferences = preferences;

          // Get software knowledge based on user's selected expertise
          if (preferences?.selected_expertise && preferences.selected_expertise.length > 0) {
            const { data: knowledge } = await supabase
              .from('ai_software_knowledge')
              .select('*')
              .in('software_name', preferences.selected_expertise)
              .eq('is_active', true);

            softwareKnowledge = knowledge || [];
          }
        }
      } catch (error) {
        console.log('Could not get user preferences:', error);
      }
    }

    // Definir as características de cada tom
    const toneConfig = {
      objetivo: {
        style: "seja direto e conciso. Use frases curtas e vá direto ao ponto. Evite floreios e foque apenas no essencial.",
        example: "Resposta direta, sem rodeios, com informações práticas e imediatas."
      },
      explicativo: {
        style: "seja detalhado e educativo. Explique o 'porquê' por trás das estratégias. Use exemplos e forneça contexto completo.",
        example: "Resposta detalhada com explicações, contexto e exemplos práticos para melhor compreensão."
      },
      amigavel: {
        style: "seja caloroso e próximo. Use uma linguagem acolhedora, inclua emojis e mantenha tom conversacional como se fosse um amigo experiente.",
        example: "Resposta calorosa e próxima, com linguagem acolhedora e tom conversacional amigável."
      },
      simpatico: {
        style: "seja carismático e empático. Demonstre compreensão pelos desafios do vendedor, use linguagem motivacional e inspiradora.",
        example: "Resposta carismática e empática, com compreensão dos desafios e linguagem motivacional."
      },
      profissional: {
        style: "seja formal e técnico. Use linguagem empresarial, termos técnicos apropriados e mantenha formalidade corporativa.",
        example: "Resposta formal e técnica, com linguagem empresarial e termos técnicos apropriados."
      }
    };

    const currentTone = toneConfig[chatTone as keyof typeof toneConfig] || toneConfig.amigavel;

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

TOM DE RESPOSTA PERSONALIZADO:
${currentTone.style}

DIRETRIZES GERAIS:
- Use linguagem brasileira natural
- Seja prático e focado em vendas
- Ofereça scripts prontos quando apropriado
- Sempre termine com uma sugestão de próximo passo

Responda sempre em português brasileiro com foco em vendas seguindo o tom personalizado definido.`;

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