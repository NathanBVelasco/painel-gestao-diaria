import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  User, 
  Bell, 
  Palette, 
  Clock,
  Shield,
  Moon,
  Sun,
  Monitor
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface UserPreferences {
  theme: string;
  daylin_reminder_time: string;
  notifications_enabled: boolean;
}

const Configuracoes = () => {
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: "light",
    daylin_reminder_time: "09:00",
    notifications_enabled: true,
  });

  useEffect(() => {
    loadUserData();
  }, [profile]);

  const loadUserData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Load profile data
      setProfileForm({
        name: profile.name,
        email: profile.email,
      });

      // Load user preferences
      const { data: prefs, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", profile.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading preferences:", error);
      } else if (prefs) {
        setPreferences({
          theme: prefs.theme || "light",
          daylin_reminder_time: prefs.daylin_reminder_time || "09:00:00",
          notifications_enabled: prefs.notifications_enabled ?? true,
        });
      }

    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profileForm.name,
          email: profileForm.email,
        })
        .eq("user_id", profile.user_id);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o perfil",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });

    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.new.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setPasswordForm({
        current: "",
        new: "",
        confirm: "",
      });

    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!profile) return;

    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);

    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          user_id: profile.user_id,
          theme: updatedPrefs.theme,
          daylin_reminder_time: updatedPrefs.daylin_reminder_time,
          notifications_enabled: updatedPrefs.notifications_enabled,
        }, {
          onConflict: "user_id"
        });

      if (error) {
        console.error("Error updating preferences:", error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as preferências",
          variant: "destructive",
        });
        return;
      }

      // Apply theme immediately
      if (newPrefs.theme) {
        document.documentElement.classList.toggle('dark', newPrefs.theme === 'dark');
      }

    } catch (error) {
      console.error("Error updating preferences:", error);
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case "light": return <Sun className="h-4 w-4" />;
      case "dark": return <Moon className="h-4 w-4" />;
      case "system": return <Monitor className="h-4 w-4" />;
      default: return <Sun className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          ⚙️ Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil, preferências e configurações da conta
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Perfil do Usuário
            </CardTitle>
            <CardDescription>
              Atualize suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="seu@email.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Usado para login e notificações
                </p>
              </div>

              <div className="space-y-2">
                <Label>Nível de Acesso</Label>
                <div className="p-2 bg-muted rounded-md">
                  <span className="text-sm font-medium capitalize">{profile?.role}</span>
                  <p className="text-xs text-muted-foreground">
                    {profile?.role === 'gestor' 
                      ? "Acesso total: dashboard da equipe, criação de prêmios" 
                      : "Acesso vendedor: apenas seus próprios dados"
                    }
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={saving} className="brand-gradient">
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Segurança
            </CardTitle>
            <CardDescription>
              Altere sua senha e configurações de segurança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  placeholder="Digite a nova senha"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  placeholder="Confirme a nova senha"
                  minLength={6}
                />
              </div>

              <Button 
                type="submit" 
                disabled={changingPassword || !passwordForm.new || !passwordForm.confirm}
                variant="outline"
              >
                {changingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Ações da Conta</h4>
              <Button
                onClick={signOut}
                variant="destructive"
                className="w-full"
              >
                Sair da Conta
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a aparência da interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tema</Label>
              <Select 
                value={preferences.theme} 
                onValueChange={(value) => handleUpdatePreferences({ theme: value })}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    {getThemeIcon(preferences.theme)}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Claro
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Escuro
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Sistema
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Escolha entre tema claro, escuro ou seguir o sistema
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Cores da TotalCAD</Label>
                <p className="text-xs text-muted-foreground">
                  Interface com as cores oficiais da marca
                </p>
              </div>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-full bg-primary"></div>
                <div className="w-4 h-4 rounded-full bg-secondary"></div>
                <div className="w-4 h-4 rounded-full bg-accent"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure lembretes e alertas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Notificações Ativas</Label>
                <p className="text-xs text-muted-foreground">
                  Receber alertas e lembretes do sistema
                </p>
              </div>
              <Switch
                checked={preferences.notifications_enabled}
                onCheckedChange={(checked) => 
                  handleUpdatePreferences({ notifications_enabled: checked })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Lembrete do Daylin
              </Label>
              <Select
                value={preferences.daylin_reminder_time}
                onValueChange={(value) => handleUpdatePreferences({ daylin_reminder_time: value })}
                disabled={!preferences.notifications_enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00:00">08:00</SelectItem>
                  <SelectItem value="08:30:00">08:30</SelectItem>
                  <SelectItem value="09:00:00">09:00</SelectItem>
                  <SelectItem value="09:30:00">09:30</SelectItem>
                  <SelectItem value="10:00:00">10:00</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Horário para lembrar de preencher o "Iniciar o Dia"
              </p>
            </div>

            <div className="space-y-3">
              <Label>Tipos de Alertas</Label>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span>Daylin não preenchido</span>
                  <Switch 
                    checked={preferences.notifications_enabled}
                    disabled={!preferences.notifications_enabled}
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span>Novos prêmios</span>
                  <Switch 
                    checked={preferences.notifications_enabled}
                    disabled={!preferences.notifications_enabled}
                  />
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span>Metas atingidas</span>
                  <Switch 
                    checked={preferences.notifications_enabled}
                    disabled={!preferences.notifications_enabled}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuracoes;