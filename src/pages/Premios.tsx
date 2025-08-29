import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Gift, 
  Plus, 
  Trophy, 
  Calendar, 
  User,
  Users,
  CheckCircle,
  Clock,
  Star,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Prize {
  id: string;
  title: string;
  description: string;
  value_or_bonus: string;
  deadline: string;
  created_by: string;
  target_users: string[];
  is_for_all: boolean;
  is_active: boolean;
  created_at: string;
  creator_name?: string;
  achievement?: {
    achieved_at: string;
    progress: number;
  };
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: string;
}

const Premios = () => {
  const { profile, isGestor } = useAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newPrize, setNewPrize] = useState({
    title: "",
    description: "",
    value_or_bonus: "",
    deadline: "",
    is_for_all: true,
    target_users: [] as string[],
  });

  useEffect(() => {
    loadPrizes();
    if (isGestor) {
      loadProfiles();
    }
  }, [profile, isGestor]);

  const loadPrizes = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      let query = supabase
        .from("prizes")
        .select(`
          *,
          prize_achievements!left (
            achieved_at,
            progress,
            user_id
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const { data: prizesData, error } = await query;

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os prêmios",
          variant: "destructive",
        });
        return;
      }

      // Get creator names
      const creatorIds = [...new Set(prizesData?.map(p => p.created_by) || [])];
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", creatorIds);

        const creatorMap = new Map(creators?.map(c => [c.user_id, c.name]) || []);

        const processedPrizes = prizesData?.map(prize => {
          // Filter achievements for current user
          const userAchievement = prize.prize_achievements?.find(
            (ach: any) => ach.user_id === profile.user_id
          );

          return {
            ...prize,
            creator_name: creatorMap.get(prize.created_by),
            achievement: userAchievement ? {
              achieved_at: userAchievement.achieved_at,
              progress: userAchievement.progress,
            } : undefined,
            prize_achievements: undefined, // Remove the raw data
          };
        }) || [];

        // Filter prizes based on user permissions
        const filteredPrizes = processedPrizes.filter(prize => {
          if (isGestor) return true; // Gestors see all prizes
          if (prize.is_for_all) return true;
          return prize.target_users?.includes(profile.user_id);
        });

        setPrizes(filteredPrizes);
      }

    } catch (error) {
      console.error("Error loading prizes:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, role")
        .eq("role", "vendedor")
        .order("name");

      if (error) {
        console.error("Error loading profiles:", error);
        return;
      }

      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const handleCreatePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isGestor) return;

    setSubmitting(true);
    try {
      const prizeData = {
        title: newPrize.title,
        description: newPrize.description,
        value_or_bonus: newPrize.value_or_bonus,
        deadline: newPrize.deadline,
        created_by: profile.user_id,
        is_for_all: newPrize.is_for_all,
        target_users: newPrize.is_for_all ? [] : newPrize.target_users,
        is_active: true,
      };

      const { error } = await supabase
        .from("prizes")
        .insert([prizeData]);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível criar o prêmio",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Prêmio criado!",
        description: "O prêmio foi criado com sucesso.",
      });

      setCreateDialogOpen(false);
      setNewPrize({
        title: "",
        description: "",
        value_or_bonus: "",
        deadline: "",
        is_for_all: true,
        target_users: [],
      });

      loadPrizes();

    } catch (error) {
      console.error("Error creating prize:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTargetUserChange = (userId: string, checked: boolean) => {
    if (checked) {
      setNewPrize({
        ...newPrize,
        target_users: [...newPrize.target_users, userId]
      });
    } else {
      setNewPrize({
        ...newPrize,
        target_users: newPrize.target_users.filter(id => id !== userId)
      });
    }
  };

  const isExpired = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  const activePrizes = prizes.filter(p => !isExpired(p.deadline));
  const expiredPrizes = prizes.filter(p => isExpired(p.deadline));

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🎁 Prêmios
          </h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie os prêmios da equipe
          </p>
        </div>

        {isGestor && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="brand-gradient">
                <Plus className="h-4 w-4 mr-2" />
                Criar Prêmio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Prêmio</DialogTitle>
                <DialogDescription>
                  Defina os detalhes do prêmio para motivar a equipe
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreatePrize} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={newPrize.title}
                    onChange={(e) => setNewPrize({ ...newPrize, title: e.target.value })}
                    placeholder="Ex: Meta do Mês"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newPrize.description}
                    onChange={(e) => setNewPrize({ ...newPrize, description: e.target.value })}
                    placeholder="Descreva os detalhes do prêmio..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value_or_bonus">Valor ou Bônus</Label>
                  <Input
                    id="value_or_bonus"
                    value={newPrize.value_or_bonus}
                    onChange={(e) => setNewPrize({ ...newPrize, value_or_bonus: e.target.value })}
                    placeholder="Ex: R$ 1.000 ou 1 dia de folga"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Prazo de Validade</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={newPrize.deadline}
                    onChange={(e) => setNewPrize({ ...newPrize, deadline: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_for_all"
                      checked={newPrize.is_for_all}
                      onCheckedChange={(checked) => 
                        setNewPrize({ ...newPrize, is_for_all: checked as boolean })
                      }
                    />
                    <Label htmlFor="is_for_all">Para toda a equipe</Label>
                  </div>

                  {!newPrize.is_for_all && (
                    <div className="space-y-2">
                      <Label>Destinatários específicos:</Label>
                      <div className="max-h-32 overflow-y-auto space-y-2">
                        {profiles.map((profile) => (
                          <div key={profile.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={profile.user_id}
                              checked={newPrize.target_users.includes(profile.user_id)}
                              onCheckedChange={(checked) => 
                                handleTargetUserChange(profile.user_id, checked as boolean)
                              }
                            />
                            <Label htmlFor={profile.user_id} className="text-sm">
                              {profile.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting} className="brand-gradient">
                    {submitting ? "Criando..." : "Criar Prêmio"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Prizes */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Prêmios em Andamento
            </CardTitle>
            <CardDescription>
              Prêmios ativos que você pode conquistar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activePrizes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum prêmio ativo no momento</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activePrizes.map((prize) => (
                  <div
                    key={prize.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      prize.achievement?.achieved_at
                        ? "border-success bg-success/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        {prize.achievement?.achieved_at && (
                          <CheckCircle className="h-4 w-4 text-success" />
                        )}
                        {prize.title}
                      </h3>
                      <Badge variant={prize.is_for_all ? "secondary" : "outline"}>
                        {prize.is_for_all ? (
                          <Users className="h-3 w-3 mr-1" />
                        ) : (
                          <User className="h-3 w-3 mr-1" />
                        )}
                        {prize.is_for_all ? "Todos" : "Específico"}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {prize.description}
                    </p>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prêmio:</span>
                        <span className="font-medium text-primary">{prize.value_or_bonus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prazo:</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(prize.deadline).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Criado por:</span>
                        <span>{prize.creator_name}</span>
                      </div>
                    </div>

                    {prize.achievement && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-muted-foreground">Progresso:</span>
                          <span className="text-sm font-medium">{prize.achievement.progress}%</span>
                        </div>
                        <Progress value={prize.achievement.progress} className="h-2" />
                        {prize.achievement.achieved_at && (
                          <div className="mt-2 flex items-center gap-2 text-success text-sm">
                            <Star className="h-3 w-3" />
                            <span>Conquistado em {new Date(prize.achievement.achieved_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expired Prizes */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Prêmios Encerrados
            </CardTitle>
            <CardDescription>
              Prêmios que já expiraram ou foram finalizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expiredPrizes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum prêmio encerrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {expiredPrizes.map((prize) => (
                  <div
                    key={prize.id}
                    className="p-4 rounded-lg border bg-muted/30 opacity-75"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-muted-foreground">
                        {prize.title}
                      </h3>
                      <Badge variant="outline" className="text-muted-foreground">
                        Expirado
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {prize.description}
                    </p>

                    <div className="text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Prêmio: {prize.value_or_bonus}</span>
                        <span>Expirou em: {new Date(prize.deadline).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Section */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Histórico de Conquistas
          </CardTitle>
          <CardDescription>
            {isGestor ? "Histórico geral da equipe" : "Seus prêmios conquistados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Funcionalidade em desenvolvimento</p>
            <p className="text-xs">Em breve você poderá ver o histórico completo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Premios;