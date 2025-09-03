import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";

interface SoftwareKnowledge {
  software_name: string;
  category: string;
  description: string;
  differentials: string;
  target_audience: string;
}


export function AIExpertiseConfig() {
  const { user } = useAuth();
  const [softwares, setSoftwares] = useState<SoftwareKnowledge[]>([]);
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
        .select("custom_instructions")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setCustomInstructions(data.custom_instructions || "");
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
      const dataToSave = {
        user_id: user.id,
        custom_instructions: customInstructions.trim() || null
      };

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

      toast.success("Instruções personalizadas salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error("Erro ao salvar instruções personalizadas");
    } finally {
      setSaving(false);
    }
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
              "Salvar Instruções Personalizadas"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}