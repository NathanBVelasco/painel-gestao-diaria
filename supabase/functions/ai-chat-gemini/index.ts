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

    // Define chat tones with their corresponding instructions
    const chatTones = {
      objetivo: "Seja direto, objetivo e focado em resultados. Use frases curtas e vá direto ao ponto dos benefícios e soluções.",
      explicativo: "Seja didático e detalhado. Explique conceitos técnicos de forma clara, use exemplos práticos e antecipe dúvidas.",
      amigavel: "Seja caloroso e próximo. Use um tom conversacional, informal mas respeitoso, como um consultor amigo.",
      simpatico: "Seja empático e compreensivo. Reconheça desafios do cliente e mostre como pode ajudar de forma genuína.",
      profissional: "Mantenha formalidade e expertise. Use linguagem técnica apropriada e demonstre profundo conhecimento do setor."
    };

    const selectedTone = chatTones[chatTone as keyof typeof chatTones] || chatTones.amigavel;

    // Build dynamic expertise knowledge
    let expertiseContext = "";
    if (softwareKnowledge.length > 0) {
      expertiseContext = `

=== CONHECIMENTO ESPECIALIZADO ===

Você é especialista nos seguintes softwares:

${softwareKnowledge.map(sw => `
**${sw.software_name}**
Categoria: ${sw.category}
Descrição: ${sw.description}

Diferenciais: ${sw.differentials}

Objeções Comuns e Respostas:
${sw.common_objections?.split('|').map((objection: string, i: number) => {
  const scripts = sw.sales_scripts?.split('|') || [];
  return `- "${objection}" → ${scripts[i] || 'Use os diferenciais para responder'}`;
}).join('\n')}

Casos de Uso: ${sw.use_cases}
ROI/Benefícios: ${sw.roi_points}
Concorrentes: ${sw.competitors}
Público-Alvo: ${sw.target_audience}
`).join('\n')}

${userPreferences?.active_software_focus ? `
FOCO PRINCIPAL: ${userPreferences.active_software_focus}
Contextualize sempre as respostas priorizando este software quando relevante.
` : ''}

${userPreferences?.custom_instructions ? `
INSTRUÇÕES PERSONALIZADAS: ${userPreferences.custom_instructions}
` : ''}
`;
    }

    // Create the system prompt with TotalCAD context and selected tone
    const systemPrompt = `Você é um especialista em vendas de softwares CAD, especialmente SketchUp e outros produtos da TotalCAD. Você atende vendedores brasileiros que trabalham com arquitetura, design e engenharia.

EMPRESA:
- TotalCAD é revendedora oficial dos produtos SketchUp no Brasil
- Foco em arquitetos, designers, engenheiros e estudantes  
- Mercado brasileiro com suas particularidades de preço e necessidades
- Concorrentes principais: AutoCAD, Revit, ArchiCAD, softwares nacionais

${expertiseContext}

OBJEÇÕES MAIS COMUNS (quando não há conhecimento específico):
1. "Muito caro" → ROI através de produtividade e qualidade
2. "Equipe não vai se adaptar" → Facilidade de aprendizado e suporte
3. "Já temos outra solução" → Complementaridade e casos específicos
4. "Não conhecemos" → Cases de sucesso e demonstrações
5. "Não precisa disso" → Impacto visual em aprovações e vendas

TOM DA CONVERSA: ${selectedTone}

Sempre forneça:
- Respostas práticas e aplicáveis ao contexto brasileiro
- Valores em reais quando possível
- Casos de uso específicos por área (residencial, comercial, paisagismo)
- Comparações justas com concorrentes quando relevante
- Próximos passos claros (demo, orçamento, teste)
- Use o conhecimento especializado dos softwares selecionados pelo usuário

Não invente preços ou dados técnicos que você não tem certeza. Se não souber algo específico, seja honesto e sugira onde buscar a informação.`;

    console.log('System prompt created with tone:', chatTone, 'and', softwareKnowledge.length, 'software expertise');

    // Process attachments if any
    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.type && attachment.type.startsWith('image/') && attachment.url) {
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
            console.error('Error processing image:', error);
          }
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
      console.error('Gemini API Error:', response.status, errorData);
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response generated by Gemini');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-chat-gemini function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});