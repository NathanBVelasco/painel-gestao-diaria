import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageCircle, Send, Loader2, Paperclip, X, Bot, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIExpertiseConfig } from "@/components/AIExpertiseConfig";

interface SoftwareKnowledge {
  software_name: string;
  category: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Array<{name: string; type: string; size: number; url?: string}>;
}

const AssistenteAI = () => {
  const { user, isGestor } = useAuth();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatTone, setChatTone] = useState("amigavel");
  const [activeFocus, setActiveFocus] = useState<string>("nenhum");
  const [softwares, setSoftwares] = useState<SoftwareKnowledge[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<{user_id: string, name: string}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadUserPreferences();
    loadSoftwareList();
    loadConversationHistory();
    if (isGestor) {
      loadAvailableUsers();
    }
  }, [user?.id, isGestor]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadAvailableUsers = async () => {
    if (!isGestor) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .neq('user_id', user?.id)
        .order('name');
        
      if (!error && data) {
        setAvailableUsers(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadSoftwareList = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_software_knowledge")
        .select("software_name, category")
        .eq("is_active", true)
        .order("software_name");

      if (error) throw error;
      setSoftwares(data || []);
    } catch (error) {
      console.error("Error loading software list:", error);
    }
  };

  const loadUserPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('ai_chat_preferences')
        .select('chat_tone, active_software_focus')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setChatTone(data.chat_tone);
        setActiveFocus(data.active_software_focus || "nenhum");
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadConversationHistory = async (targetUserId?: string) => {
    const userIdToLoad = targetUserId || user?.id;
    if (!userIdToLoad) return;

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('message, response, attachments, created_at')
        .eq('user_id', userIdToLoad)
        .order('created_at', { ascending: true })
        .limit(50); // Load last 50 conversations

      if (error) {
        console.error('Error loading conversation history:', error);
        return;
      }

      if (data && data.length > 0) {
        const historicalMessages: Message[] = [];
        
        data.forEach(conv => {
          // Add user message
          historicalMessages.push({
            role: 'user',
            content: conv.message,
            attachments: Array.isArray(conv.attachments) ? conv.attachments as Array<{name: string; type: string; size: number; url?: string}> : []
          });
          
          // Add AI response
          historicalMessages.push({
            role: 'assistant',
            content: conv.response
          });
        });

        setMessages(historicalMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const saveUserPreference = async (field: 'chat_tone' | 'active_software_focus', value: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('ai_chat_preferences')
        .upsert(
          { user_id: user.id, [field]: value },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Error saving preference:', error);
        toast.error("Erro ao salvar preferência");
        return;
      }

      if (field === 'chat_tone') {
        setChatTone(value);
      } else if (field === 'active_software_focus') {
        setActiveFocus(value);
      }
      
      toast.success("Preferência salva com sucesso");
    } catch (error) {
      console.error('Error saving preference:', error);
      toast.error("Erro ao salvar preferência");
    }
  };

  const sendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;
    
    setIsLoading(true);
    const userMessage: Message = { 
      role: 'user', 
      content: message, 
      attachments: attachments.map(f => ({ name: f.name, type: f.type, size: f.size }))
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage("");
    setAttachments([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-gemini', {
        body: { 
          message: currentMessage, 
          chatTone,
          activeFocus: activeFocus !== "nenhum" ? activeFocus : null,
          attachments: userMessage.attachments || []
        }
      });
      
      if (error) throw error;
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isImage && !isPDF) {
        toast.error(`${file.name} não é uma imagem ou PDF`);
        return false;
      }
      
      if (!isValidSize) {
        toast.error(`${file.name} excede o limite de 10MB`);
        return false;
      }
      
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat com IA
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurar Expertise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6" />
                Assistente de Vendas IA Especialista
              </CardTitle>
              <CardDescription>
                IA especializada em vendas de softwares CAD com conhecimento dinâmico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Selection for Gestors */}
              {isGestor && (
                <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
                  <Label htmlFor="user-select">Visualizar conversas de:</Label>
                  <Select 
                    value={selectedUserId || user?.id} 
                    onValueChange={(value) => {
                      setSelectedUserId(value);
                      loadConversationHistory(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user?.id || ""}>Minhas conversas</SelectItem>
                      {availableUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedUserId && selectedUserId !== user?.id && (
                    <Badge variant="secondary" className="mt-2">
                      📊 Visualizando histórico de outro usuário
                    </Badge>
                  )}
                </div>
              )}

              {/* Tone and Software Focus Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chat-tone">Tom da Conversa</Label>
                  <Select value={chatTone} onValueChange={(value) => saveUserPreference('chat_tone', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tom da conversa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="objetivo">Objetivo</SelectItem>
                      <SelectItem value="explicativo">Explicativo</SelectItem>
                      <SelectItem value="amigavel">Amigável</SelectItem>
                      <SelectItem value="simpatico">Simpático</SelectItem>
                      <SelectItem value="profissional">Profissional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="software-focus">Software de Foco Principal</Label>
                  <Select value={activeFocus} onValueChange={(value) => saveUserPreference('active_software_focus', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o foco principal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Nenhum</SelectItem>
                      {softwares.map((software) => (
                        <SelectItem 
                          key={software.software_name} 
                          value={software.software_name.toLowerCase().replace(/\s+/g, "_")}
                        >
                          {software.software_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="h-[400px] w-full border rounded-md p-4 bg-muted/30">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="rounded-lg bg-muted p-3">
                          <p className="text-sm">
                            👋 Olá! Sou seu assistente especialista em vendas de softwares CAD. 
                            Configure minha expertise na aba "Configurar Expertise" e depois converse comigo sobre estratégias, objeções e técnicas de venda!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-3 max-w-[80%]",
                        msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {msg.role === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {msg.attachments.map((att, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {att.type === 'image' ? '📷' : '📄'} {att.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>A IA está pensando...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-background px-2 py-1 rounded border"
                    >
                      <span className="text-sm">
                        {file.type.startsWith('image/') ? '📷' : '📄'} {file.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Input */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={message}
                      onChange={handleTextareaChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem sobre vendas de softwares CAD..."
                      className="min-h-[80px] resize-none pr-12"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 h-8 w-8 p-0"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || (!message.trim() && attachments.length === 0)}
                    className="px-6"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <AIExpertiseConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssistenteAI;