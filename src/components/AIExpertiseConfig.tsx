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
  const [selectedSoftwares, setSelectedSoftwares] = useState<string[]>([]);
  const [activeFocus, setActiveFocus] = useState<string>("sketchup");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [expertiseTemplate, setExpertiseTemplate] = useState<string>("general");
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
        setSelectedSoftwares(Array.isArray(data.selected_expertise) ? data.selected_expertise : []);
        setActiveFocus(data.active_software_focus || "sketchup");
        setCustomInstructions(data.custom_instructions || "");
        setExpertiseTemplate(data.expertise_template || "general");
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
      
      // Validate data before saving
      const dataToSave = {
        user_id: user.id,
        selected_expertise: selectedSoftwares.length > 0 ? selectedSoftwares : [],
        active_software_focus: normalizedActiveFocus,
        custom_instructions: customInstructions.trim() || null,
        expertise_template: expertiseTemplate
      };

      console.log("Saving AI preferences:", dataToSave);

      const { error } = await supabase
        .from("ai_chat_preferences")
        .upsert(dataToSave);

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
      if (error?.message?.includes("duplicate key")) {
        errorMessage = "Erro de duplicação - tentando novamente...";
        // Retry once for duplicate key errors
        setTimeout(() => savePreferences(), 1000);
        return;
      } else if (error?.message?.includes("constraint")) {
        errorMessage = "Erro de validação de dados";
      } else if (error?.code === "23505") {
        errorMessage = "Configuração já existe - atualizando...";
      }
      
      toast.error(`${errorMessage}: ${error?.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: ExpertiseTemplate) => {
    setSelectedSoftwares(template.softwares);
    setExpertiseTemplate(template.id);
    // Standardize string processing consistently
    setActiveFocus(template.softwares[0].toLowerCase().replace(/\s+/g, "_"));
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const toggleSoftware = (software: string) => {
    setSelectedSoftwares(prev =>
      prev.includes(software)
        ? prev.filter(s => s !== software)
        : [...prev, software]
    );
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
            Configure os softwares em que a IA será especialista para suas conversas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Templates Pré-configurados */}
          <div>
            <Label className="text-base font-medium">Templates de Expertise</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Aplique configurações pré-definidas para diferentes perfis profissionais
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expertiseTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    expertiseTemplate === template.id ? 'ring-2 ring-primary' : ''
                  }`}
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

          {/* Seleção de Softwares */}
          <div>
            <Label className="text-base font-medium">Softwares Especializados</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Selecione os softwares em que a IA deve ter expertise
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {softwares.map((software) => (
                <div
                  key={software.software_name}
                  className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={software.software_name}
                    checked={selectedSoftwares.includes(software.software_name)}
                    onCheckedChange={() => toggleSoftware(software.software_name)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Label
                        htmlFor={software.software_name}
                        className="font-medium cursor-pointer"
                      >
                        {software.software_name}
                      </Label>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getCategoryColor(software.category)}`}
                      >
                        {software.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {software.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {software.target_audience}
                    </p>
                  </div>
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
                {selectedSoftwares.map((software) => (
                  <SelectItem 
                    key={software} 
                    value={software.toLowerCase().replace(/\s+/g, "_")}
                  >
                    {software}
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
            disabled={saving || selectedSoftwares.length === 0}
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