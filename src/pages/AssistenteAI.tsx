import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Send, 
  MessageSquare, 
  Lightbulb, 
  Phone, 
  Mail, 
  MessageCircle,
  Image as ImageIcon,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  message: string;
  response: string;
  created_at: string;
}

interface Suggestion {
  id: string;
  title: string;
  category: string;
  content: string;
}

const AssistenteAI = () => {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Predefined suggestions
  const suggestions: Suggestion[] = [
    {
      id: "1",
      title: "Resposta para objeção de preço",
      category: "whatsapp",
      content: `Entendo sua preocupação com o investimento! 💰

O valor do SketchUp não é apenas pelo software, mas pela transformação que ele traz para seu trabalho:

✅ Redução de 70% no tempo de modelagem
✅ Apresentações profissionais que impressionam clientes
✅ Menos retrabalho e mais precisão nos projetos

Muitos clientes me dizem que o software se pagou já no primeiro projeto! 

Que tal conversarmos sobre um plano que se ajuste ao seu orçamento? 😊`
    },
    {
      id: "2", 
      title: "Follow-up pós-demonstração",
      category: "email",
      content: `Assunto: Sua apresentação SketchUp - Próximos passos

Olá [Nome],

Foi um prazer apresentar as funcionalidades do SketchUp para você hoje! 

Vi que ficou interessado especialmente nos recursos de:
• Modelagem 3D intuitiva
• Biblioteca de componentes
• Renderização realística

Para dar continuidade, preparei uma proposta personalizada considerando suas necessidades específicas.

Quando podemos conversar para alinhar os detalhes?

Abraço,
[Seu nome]`
    },
    {
      id: "3",
      title: "Abordagem para renovação",
      category: "ligacao",
      content: `Roteiro para ligação de renovação:

1. **Abertura calorosa:** "Oi [Nome], tudo bem? É o [Seu nome] da TotalCAD"

2. **Contexto:** "Estou ligando porque sua licença vence em [X dias] e queria garantir que você não fique sem acesso"

3. **Valor agregado:** "Aproveitando, temos novidades interessantes na nova versão que podem ajudar ainda mais seus projetos"

4. **Próximos passos:** "Posso te enviar a proposta de renovação por e-mail hoje mesmo?"

5. **Fechamento:** "Alguma dúvida sobre o processo? Estou aqui para ajudar!"

**Lembre-se:** Foque nos benefícios, não apenas no vencimento!`
    },
    {
      id: "4",
      title: "Cross-selling Layout",
      category: "whatsapp", 
      content: `Oi [Nome]! 👋

Vi que você está usando bem o SketchUp e pensei em você para uma oportunidade incrível!

Conhece o LayOut? É o complemento perfeito para criar pranchas técnicas profissionais diretamente dos seus modelos 3D! 📐

✨ **Imagine poder:**
• Gerar plantas baixas automaticamente
• Criar apresentações de alto nível
• Documentação técnica completa

Quer ver como funciona? Posso mostrar rapidinho como vai agilizar ainda mais seu trabalho! 

Quando você teria uns 15 minutinhos? 😊`
    }
  ];

  const objections = [
    {
      objection: "Muito caro",
      response: "Entendo! Vamos conversar sobre o ROI. Em quantos projetos você trabalha por mês? O SketchUp geralmente se paga no primeiro projeto pela economia de tempo."
    },
    {
      objection: "Já uso outro software",
      response: "Ótimo! Qual você usa? O SketchUp é conhecido por sua curva de aprendizado rápida. Muitos profissionais usam ambos - SketchUp para concept e ideação rápida."
    },
    {
      objection: "Não tenho tempo para aprender",
      response: "Perfeito! Essa é exatamente a vantagem do SketchUp - você aprende o básico em algumas horas. Temos tutoriais guiados e suporte completo."
    },
    {
      objection: "Vou pensar",
      response: "Claro! É uma decisão importante. Que tal eu te enviar alguns cases de sucesso de profissionais similares a você? Assim você pode ver os resultados práticos."
    },
    {
      objection: "Preciso consultar meu sócio",
      response: "Faz todo sentido! Quer que eu prepare uma apresentação para vocês dois? Posso mostrar os benefícios específicos para o negócio de vocês."
    }
  ];

  useEffect(() => {
    loadConversationHistory();
  }, [profile]);

  useEffect(() => {
    scrollToBottom();
  }, [conversations]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadConversationHistory = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error loading conversations:", error);
        return;
      }

      setConversations(data || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !profile || loading) return;

    const userMessage = message.trim();
    setMessage("");
    setLoading(true);

    // Add user message to chat immediately
    const tempId = Date.now().toString();
    const newConversation: Conversation = {
      id: tempId,
      message: userMessage,
      response: "Pensando... 🤔",
      created_at: new Date().toISOString(),
    };

    setConversations(prev => [...prev, newConversation]);

    try {
      // Generate AI response using Gemini
      const aiResponse = await generateAIResponse(userMessage);

      // Save to database
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert([{
          user_id: profile.user_id,
          message: userMessage,
          response: aiResponse,
        }])
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível salvar a conversa",
          variant: "destructive",
        });
        return;
      }

      // Update conversation with real response
      setConversations(prev => 
        prev.map(conv => 
          conv.id === tempId 
            ? { ...data, response: aiResponse }
            : conv
        )
      );

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // AI response generation using Gemini API
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      const response = await supabase.functions.invoke('ai-chat-gemini', {
        body: { message: userMessage }
      });

      if (response.error) {
        console.error('Erro ao chamar Edge Function:', response.error);
        throw new Error(response.error.message || 'Erro na comunicação com a IA');
      }

      return response.data?.response || 'Desculpe, não consegui gerar uma resposta no momento.';
    } catch (error) {
      console.error('Erro ao gerar resposta da IA:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.';
    }
  };

  const handleUseSuggestion = (content: string) => {
    setMessage(content);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "whatsapp": return <MessageCircle className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      case "ligacao": return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "whatsapp": return "bg-green-100 text-green-800 border-green-200";
      case "email": return "bg-blue-100 text-blue-800 border-blue-200";
      case "ligacao": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          🤖 Assistente AI
        </h1>
        <p className="text-muted-foreground">
          Seu coach de vendas pessoal com dicas e estratégias
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Area */}
        <Card className="lg:col-span-2 card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Chat de Vendas
            </CardTitle>
            <CardDescription>
              Converse comigo sobre estratégias, objeções e técnicas de venda
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col h-[500px]">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Bot className="h-6 w-6 animate-pulse text-primary" />
                    <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Welcome message */}
                    {conversations.length === 0 && (
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="rounded-lg bg-muted p-3">
                            <p className="text-sm">
                              👋 Olá! Sou seu assistente de vendas. Estou aqui para ajudar com estratégias, objeções, scripts e muito mais!
                              
                              Pergunte qualquer coisa sobre vendas ou use as sugestões ao lado.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {conversations.map((conv) => (
                      <div key={conv.id} className="space-y-3">
                        {/* User message */}
                        <div className="flex justify-end gap-3">
                          <div className="flex-1 max-w-[80%]">
                            <div className="rounded-lg bg-primary text-primary-foreground p-3 ml-auto">
                              <p className="text-sm whitespace-pre-wrap">{conv.message}</p>
                            </div>
                          </div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                            <User className="h-4 w-4" />
                          </div>
                        </div>

                        {/* AI response */}
                        <div className="flex gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="rounded-lg bg-muted p-3">
                              <p className="text-sm whitespace-pre-wrap">{conv.response}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua pergunta sobre vendas..."
                    disabled={loading}
                  />
                  <Button type="submit" disabled={loading || !message.trim()} className="brand-gradient">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar with suggestions */}
        <div className="space-y-6">
          {/* Quick Suggestions */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-primary" />
                Sugestões Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="templates" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="objections">Objeções</TabsTrigger>
                </TabsList>

                <TabsContent value="templates" className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium">{suggestion.title}</h4>
                        <Badge className={getCategoryColor(suggestion.category)}>
                          {getCategoryIcon(suggestion.category)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {suggestion.content.split('\n')[0]}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUseSuggestion(suggestion.content)}
                        className="w-full"
                      >
                        Usar Template
                      </Button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="objections" className="space-y-3">
                  {objections.map((item, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-card">
                      <h4 className="text-sm font-medium text-destructive mb-2">
                        "{item.objection}"
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {item.response}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUseSuggestion(`Como responder: "${item.objection}"`)}
                        className="w-full"
                      >
                        Pedir Ajuda
                      </Button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-4 w-4 text-primary" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleUseSuggestion("Como melhorar minha taxa de conversão?")}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Dicas de Conversão
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleUseSuggestion("Estratégias para follow-up")}
              >
                <Users className="h-4 w-4 mr-2" />
                Follow-up Efetivo
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleUseSuggestion("Como apresentar valor ao cliente?")}
              >
                <Target className="h-4 w-4 mr-2" />
                Apresentar Valor
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Simple User icon component
const User = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default AssistenteAI;