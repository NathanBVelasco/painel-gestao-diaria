import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Settings, Zap, Target, Users, Palette } from "lucide-react";

interface SoftwareKnowledge {
  software_name: string;
  category: string;
  description: string;
  differentials: string;
  target_audience: string;
}

interface ExpertiseTemplate {
  id: string;
  name: string;
  description: string;
  softwares: string[];
  icon: JSX.Element;
}

const expertiseTemplates: ExpertiseTemplate[] = [
  {
    id: "arquiteto_completo",
    name: "Arquiteto Completo",
    description: "SketchUp + V-Ray + Enscape para projetos arquitetônicos completos",
    softwares: ["SketchUp Pro", "SketchUp Studio", "V-Ray", "Enscape"],
    icon: <Target className="h-4 w-4" />
  },
  {
    id: "renderista_profissional", 
    name: "Renderista Profissional",
    description: "Especialista em renderização com múltiplas engines",
    softwares: ["V-Ray", "Corona", "Enscape", "Chaos Vantage"],
    icon: <Palette className="h-4 w-4" />
  },
  {
    id: "escritorio_bim",
    name: "Escritório BIM",
    description: "Fluxo BIM colaborativo e documentação técnica",
    softwares: ["SketchUp Pro", "Trimble Connect", "Archline"],
    icon: <Users className="h-4 w-4" />
  },
  {
    id: "cad_economico",
    name: "CAD Econômico",
    description: "Alternativas acessíveis para projetos técnicos",
    softwares: ["ZWCAD", "Archline"],
    icon: <Zap className="h-4 w-4" />
  }
];

export function AIExpertiseConfig() {
  const { user } = useAuth();
  const [softwares, setSoftwares] = useState<SoftwareKnowledge[]>([]);
  const [activeFocus, setActiveFocus] = useState<string>("sketchup");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSoftwareKnowledge();
    loadUserPreferences();
  }, [user?.id]);

  const loadSoftwareKnowledge = async () => {
    try {
      // Only access basic, non-sensitive fields for all users
      // Sensitive business data like pricing_strategy, sales_scripts, etc. is protected
      const { data, error } = await supabase
        .from("ai_software_knowledge")
        .select("software_name, category, description, differentials, target_audience")
        .eq("is_active", true)
        .order("software_name");

      if (error) throw error;
      setSoftwares(data || []);
    } catch (error) {
      console.error("Error loading software knowledge:", error);
      toast.error("Erro ao carregar conhecimentos de software");
    }
  };

  const loadUserPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("ai_chat_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setActiveFocus(data.active_software_focus || "sketchup");
        setCustomInstructions(data.custom_instructions || "");
        console.log("Loaded user preferences:", data);
      }
    } catch (error) {
      console.error("Error loading user preferences:", error);
      toast.error("Erro ao carregar preferências do usuário");
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      // Standardize string processing for activeFocus
      const normalizedActiveFocus = activeFocus.toLowerCase().replace(/\s+/g, "_");
      
      const dataToSave = {
        user_id: user.id,
        active_software_focus: normalizedActiveFocus,
        custom_instructions: customInstructions.trim() || null
      };

      console.log("Saving AI preferences:", dataToSave);

      // Check if record exists first for better logging
      const { data: existingRecord } = await supabase
        .from("ai_chat_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log(existingRecord ? "Updating existing preferences" : "Creating new preferences");

      // Use onConflict to properly handle unique constraint
      const { error } = await supabase
        .from("ai_chat_preferences")
        .upsert(dataToSave, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      console.log("AI preferences saved successfully");
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      
      // Provide more specific error messages
      let errorMessage = "Erro ao salvar configurações";
      if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
        errorMessage = "Erro de chave duplicada - verificando dados...";
      } else if (error?.message?.includes("constraint")) {
        errorMessage = "Erro de validação de dados";
      } else if (error?.message?.includes("permission")) {
        errorMessage = "Erro de permissão - verifique seu login";
      }
      
      toast.error(`${errorMessage}. Detalhes: ${error?.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: ExpertiseTemplate) => {
    // Set focus to the first software in the template
    setActiveFocus(template.softwares[0].toLowerCase().replace(/\s+/g, "_"));
    toast.success(`Foco definido para "${template.name}"!`);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      modelagem_3d: "bg-blue-100 text-blue-800 border-blue-200",
      renderizacao: "bg-purple-100 text-purple-800 border-purple-200", 
      colaboracao: "bg-green-100 text-green-800 border-green-200",
      animacao: "bg-orange-100 text-orange-800 border-orange-200"
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Expertise
          </CardTitle>
          <CardDescription>
            A IA é especialista em todos os softwares da TotalCAD. Configure apenas o foco principal e instruções personalizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Templates de Foco */}
          <div>
            <Label className="text-base font-medium">Templates de Foco</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Defina rapidamente o foco principal baseado em perfis profissionais
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expertiseTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => applyTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {template.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.softwares.map((software) => (
                            <Badge key={software} variant="secondary" className="text-xs">
                              {software}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Conhecimento da IA - Read Only */}
          <div>
            <Label className="text-base font-medium">Conhecimento da IA ✅</Label>
            <p className="text-sm text-muted-foreground mb-4">
              A IA já é especialista em todos estes softwares automaticamente
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {softwares.map((software) => (
                <div
                  key={software.software_name}
                  className="p-3 border rounded-lg bg-muted/20"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-sm">{software.software_name}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getCategoryColor(software.category)}`}
                    >
                      {software.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {software.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Foco Principal */}
          <div>
            <Label className="text-base font-medium">Software de Foco Principal</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Defina qual software será o contexto principal nas conversas
            </p>
            <Select value={activeFocus} onValueChange={setActiveFocus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o foco principal" />
              </SelectTrigger>
              <SelectContent>
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

          {/* Instruções Personalizadas */}
          <div>
            <Label className="text-base font-medium">Instruções Personalizadas</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Adicione contexto específico ou instruções especiais para a IA
            </p>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ex: Foque em projetos residenciais, use sempre valores em reais, mencione nossa parceria com X..."
              rows={4}
            />
          </div>

          <Button 
            onClick={savePreferences} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Configurações"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}