import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Bot, Lightbulb, Target, MessageSquare, FileText, Phone, Mail, Paperclip, Image, File as FileIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  message: string;
  response: string;
  created_at: string;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
    url: string;
  }>;
  attachment_urls?: string[];
}

interface Suggestion {
  id: string;
  title: string;
  category: string;
  content: string;
}

const AssistenteAI = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar conversas:', error);
        return;
      }

      if (data) {
        // Converter dados do Supabase para nosso tipo
        const convertedData: Conversation[] = data.map(conv => ({
          ...conv,
          attachments: Array.isArray(conv.attachments) ? conv.attachments as Array<{name: string; type: string; size: number; url: string}> : []
        }));
        setConversations(convertedData);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };

  const uploadFiles = async (files: File[]): Promise<Array<{name: string; type: string; size: number; url: string}>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const uploadedFiles = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (error) {
        console.error('Erro no upload:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      uploadedFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        url: publicUrl
      });
    }

    return uploadedFiles;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isImage && !isPDF) {
        toast({
          title: "Arquivo não suportado",
          description: `${file.name} não é uma imagem ou PDF`,
          variant: "destructive"
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 10MB`,
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && selectedFiles.length === 0) || loading || uploading) return;

    const userMessage = message;
    const filesToUpload = [...selectedFiles];
    setMessage("");
    setSelectedFiles([]);
    setLoading(true);
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para usar o assistente",
          variant: "destructive"
        });
        return;
      }

      // Upload dos arquivos se houver
      let uploadedFiles: Array<{name: string; type: string; size: number; url: string}> = [];
      if (filesToUpload.length > 0) {
        uploadedFiles = await uploadFiles(filesToUpload);
      }

      setUploading(false);

      // Gerar resposta da IA com contexto dos arquivos
      const aiResponse = await generateAIResponse(userMessage, uploadedFiles);

      // Salvar conversa no banco
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          message: userMessage,
          response: aiResponse,
          attachments: uploadedFiles,
          attachment_urls: uploadedFiles.map(f => f.url)
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar conversa:', error);
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar a conversa",
          variant: "destructive"
        });
        return;
      }

      if (data) {
        const convertedData: Conversation = {
          ...data,
          attachments: Array.isArray(data.attachments) ? data.attachments as Array<{name: string; type: string; size: number; url: string}> : []
        };
        setConversations(prev => [...prev, convertedData]);
      }

    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar sua mensagem",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const generateAIResponse = async (userMessage: string, attachments?: Array<{name: string; type: string; size: number; url: string}>): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-gemini', {
        body: { 
          message: userMessage,
          attachments: attachments || []
        }
      });

      if (error) {
        console.error('Erro na função AI:', error);
        throw error;
      }

      return data.response || 'Desculpe, não consegui gerar uma resposta no momento.';
    } catch (error) {
      console.error('Erro ao gerar resposta da IA:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations]);

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
    }
  ];

  const handleUseSuggestion = (content: string) => {
    setMessage(content);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "whatsapp": return <MessageSquare className="h-4 w-4" />;
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
              <ScrollArea className="flex-1 p-4">
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
                            
                            Pergunte qualquer coisa sobre vendas ou anexe imagens/PDFs para análise.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {conversations.map((conv, index) => (
                    <div key={index} className="space-y-4">
                      {/* Mensagem do usuário */}
                      <div className="flex gap-3 justify-end">
                        <div className="max-w-[80%] space-y-2">
                          {conv.attachments && conv.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-end">
                              {conv.attachments.map((attachment, attachIndex) => (
                                <div key={attachIndex} className="bg-background border rounded-lg p-2">
                                  {attachment.type.startsWith('image/') ? (
                                    <div className="space-y-1">
                                      <img 
                                        src={attachment.url} 
                                        alt={attachment.name}
                                        className="max-w-[200px] max-h-[150px] object-cover rounded"
                                      />
                                      <p className="text-xs text-muted-foreground">{attachment.name}</p>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-red-500" />
                                      <span className="text-sm">{attachment.name}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                            <p className="text-sm">{conv.message}</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Resposta da IA */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="max-w-[80%] bg-muted p-3 rounded-lg">
                          <div className="prose prose-sm max-w-none">
                            {conv.response.split('\n').map((paragraph, pIndex) => (
                              <p key={pIndex} className="mb-2 last:mb-0 text-sm">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Arquivos Selecionados */}
              {selectedFiles.length > 0 && (
                <div className="border-t p-4 bg-muted/20">
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                        {file.type.startsWith('image/') ? (
                          <Image className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileIcon className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Digite sua pergunta sobre vendas ou anexe imagens/PDFs..."
                      disabled={loading || uploading}
                      className="min-h-[80px] max-h-[200px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || uploading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading || uploading || (!message.trim() && selectedFiles.length === 0)} 
                      className="brand-gradient"
                      size="icon"
                    >
                      {uploading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </form>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
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
                <Lightbulb className="h-4 w-4 text-primary" />
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
                <Target className="h-4 w-4 mr-2" />
                Follow-up Efetivo
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