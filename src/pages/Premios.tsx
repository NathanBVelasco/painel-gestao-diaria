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
  Target,
  TrendingUp,
  UserCheck,
  Package,
  RefreshCcw,
  Edit3
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  criteria_type?: string;
  criteria_target?: number;
  criteria_period?: string;
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
  const [allUsersProgress, setAllUsersProgress] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newPrize, setNewPrize] = useState({
    title: "",
    description: "",
    value_or_bonus: "",
    deadline: "",
    is_for_all: true,
    target_users: [] as string[],
    criteria_type: "",
    criteria_target: 0,
    criteria_period: "week",
  });

  const [editPrize, setEditPrize] = useState({
    title: "",
    description: "",
    value_or_bonus: "",
    deadline: "",
    is_for_all: true,
    target_users: [] as string[],
    criteria_type: "",
    criteria_target: 0,
    criteria_period: "week",
  });

  useEffect(() => {
    if (profile) {
      loadPrizes();
      if (isGestor) {
        loadProfiles();
        loadAllUsersProgress();
      }
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

        // Calculate progress for prizes with criteria
        const processedPrizes = await Promise.all(
          (prizesData || []).map(async (prize) => {
            // Filter achievements for current user
            const userAchievement = prize.prize_achievements?.find(
              (ach: any) => ach.user_id === profile.user_id
            );

            let calculatedProgress = userAchievement?.progress || 0;

            // Calculate progress from daily reports if criteria is set
            if (prize.criteria_type && prize.criteria_target) {
              calculatedProgress = await calculatePrizeProgress(
                prize.criteria_type,
                prize.criteria_target,
                prize.criteria_period || 'week',
                prize.created_at,
                prize.deadline,
                profile.user_id
              );
            }

            return {
              ...prize,
              creator_name: creatorMap.get(prize.created_by),
              achievement: userAchievement || (calculatedProgress > 0) ? {
                achieved_at: calculatedProgress >= 100 ? new Date().toISOString() : "",
                progress: calculatedProgress,
              } : undefined,
              prize_achievements: undefined, // Remove the raw data
            };
          })
        );

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

  const calculatePrizeProgress = async (
    criteriaType: string,
    criteriaTarget: number,
    criteriaPeriod: string,
    prizeCreatedAt: string,
    prizeDeadline: string,
    userId: string
  ): Promise<number> => {
    try {
      // Define date range based on criteria period
      let startDate = new Date(prizeCreatedAt);
      const endDate = new Date(Math.min(new Date().getTime(), new Date(prizeDeadline).getTime()));

      if (criteriaPeriod === 'week') {
        // Get start of current week
        const now = new Date();
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      } else if (criteriaPeriod === 'month') {
        // Get start of current month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (criteriaPeriod === 'day') {
        // Today only
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      }

      // Query daily reports in the period
      const { data: reports, error } = await supabase
        .from("daily_reports")
        .select(criteriaType)
        .eq("user_id", userId)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0]);

      if (error || !reports) {
        console.error("Error fetching reports for progress:", error);
        return 0;
      }

      // Sum the values for the criteria
      const total = reports.reduce((sum: number, report: any) => {
        const value = report[criteriaType];
        return sum + (typeof value === 'number' ? value : 0);
      }, 0);

      // Calculate percentage
      const progress = Math.min((total / criteriaTarget) * 100, 100);
      return Math.round(progress);

    } catch (error) {
      console.error("Error calculating progress:", error);
      return 0;
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

  const loadAllUsersProgress = async () => {
    if (!isGestor) return;

    try {
      // Get all active prizes
      const { data: activePrizesData, error: prizesError } = await supabase
        .from("prizes")
        .select("*")
        .eq("is_active", true);

      if (prizesError || !activePrizesData) {
        console.error("Error loading prizes for progress:", prizesError);
        return;
      }

      // Get all vendedor profiles
      const { data: vendedorProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("role", "vendedor");

      if (profilesError || !vendedorProfiles) {
        console.error("Error loading profiles for progress:", profilesError);
        return;
      }

      // Calculate progress for each user and each prize
      const progressData = [];
      
      for (const prize of activePrizesData) {
        for (const vendedor of vendedorProfiles) {
          let progress = 0;
          
          if (prize.criteria_type && prize.criteria_target) {
            progress = await calculatePrizeProgress(
              prize.criteria_type,
              prize.criteria_target,
              prize.criteria_period || 'week',
              prize.created_at,
              prize.deadline,
              vendedor.user_id
            );
          }

          progressData.push({
            prizeId: prize.id,
            prizeTitle: prize.title,
            userId: vendedor.user_id,
            userName: vendedor.name,
            progress: progress,
            isAchieved: progress >= 100,
            criteriaType: prize.criteria_type,
            criteriaTarget: prize.criteria_target,
            criteriaePeriod: prize.criteria_period
          });
        }
      }

      setAllUsersProgress(progressData);
    } catch (error) {
      console.error("Error loading all users progress:", error);
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
        criteria_type: newPrize.criteria_type && newPrize.criteria_type !== "none" ? newPrize.criteria_type : null,
        criteria_target: newPrize.criteria_target || null,
        criteria_period: newPrize.criteria_period || null,
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
        criteria_type: "",
        criteria_target: 0,
        criteria_period: "week",
      });

      loadPrizes();
      if (isGestor) {
        loadAllUsersProgress();
      }

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

  const handleEditTargetUserChange = (userId: string, checked: boolean) => {
    if (checked) {
      setEditPrize({
        ...editPrize,
        target_users: [...editPrize.target_users, userId]
      });
    } else {
      setEditPrize({
        ...editPrize,
        target_users: editPrize.target_users.filter(id => id !== userId)
      });
    }
  };

  const openEditDialog = (prize: Prize) => {
    setEditingPrize(prize);
    setEditPrize({
      title: prize.title,
      description: prize.description,
      value_or_bonus: prize.value_or_bonus,
      deadline: prize.deadline,
      is_for_all: prize.is_for_all,
      target_users: prize.target_users || [],
      criteria_type: prize.criteria_type || "",
      criteria_target: prize.criteria_target || 0,
      criteria_period: prize.criteria_period || "week",
    });
    setEditDialogOpen(true);
  };

  const handleEditPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isGestor || !editingPrize) return;

    setSubmitting(true);
    try {
      const prizeData = {
        title: editPrize.title,
        description: editPrize.description,
        value_or_bonus: editPrize.value_or_bonus,
        deadline: editPrize.deadline,
        is_for_all: editPrize.is_for_all,
        target_users: editPrize.is_for_all ? [] : editPrize.target_users,
        criteria_type: editPrize.criteria_type && editPrize.criteria_type !== "none" ? editPrize.criteria_type : null,
        criteria_target: editPrize.criteria_target || null,
        criteria_period: editPrize.criteria_period || null,
      };

      const { error } = await supabase
        .from("prizes")
        .update(prizeData)
        .eq("id", editingPrize.id);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível editar o prêmio",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Prêmio editado!",
        description: "O prêmio foi atualizado com sucesso.",
      });

      setEditDialogOpen(false);
      setEditingPrize(null);
      setEditPrize({
        title: "",
        description: "",
        value_or_bonus: "",
        deadline: "",
        is_for_all: true,
        target_users: [],
        criteria_type: "",
        criteria_target: 0,
        criteria_period: "week",
      });

      loadPrizes();
      if (isGestor) {
        loadAllUsersProgress();
      }

    } catch (error) {
      console.error("Error editing prize:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getCriteriaIcon = (criteriaType: string) => {
    switch (criteriaType) {
      case 'sales_amount':
        return <TrendingUp className="h-3 w-3 text-primary" />;
      case 'onboarding':
        return <UserCheck className="h-3 w-3 text-primary" />;
      case 'packs_vendidos':
        return <Package className="h-3 w-3 text-primary" />;
      case 'cross_selling':
        return <Target className="h-3 w-3 text-primary" />;
      case 'sketchup_renewed':
      case 'chaos_renewed':
        return <RefreshCcw className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  const getCriteriaPeriodLabel = (period: string) => {
    switch (period) {
      case 'day':
        return 'diário';
      case 'week':
        return 'semanal';
      case 'month':
        return 'mensal';
      default:
        return period;
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

                 {/* Criteria Section */}
                 <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                   <Label className="text-sm font-medium">🎯 Critério de Performance (Opcional)</Label>
                   <p className="text-xs text-muted-foreground">
                     Vincule o prêmio a uma meta específica de performance
                   </p>
                   
                   <div className="space-y-3">
                     <div className="space-y-2">
                       <Label htmlFor="criteria_type">Tipo de Meta</Label>
                       <Select
                         value={newPrize.criteria_type}
                         onValueChange={(value) => setNewPrize({ ...newPrize, criteria_type: value })}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecione um tipo de meta" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="none">Sem critério específico</SelectItem>
                           <SelectItem value="sales_amount">
                             <div className="flex items-center gap-2">
                               <TrendingUp className="h-4 w-4" />
                               Valor de Vendas (R$)
                             </div>
                           </SelectItem>
                           <SelectItem value="onboarding">
                             <div className="flex items-center gap-2">
                               <UserCheck className="h-4 w-4" />
                               Onboardings
                             </div>
                           </SelectItem>
                           <SelectItem value="packs_vendidos">
                             <div className="flex items-center gap-2">
                               <Package className="h-4 w-4" />
                               Packs Vendidos
                             </div>
                           </SelectItem>
                           <SelectItem value="cross_selling">
                             <div className="flex items-center gap-2">
                               <Target className="h-4 w-4" />
                               Cross Selling
                             </div>
                           </SelectItem>
                           <SelectItem value="sketchup_renewed">
                             <div className="flex items-center gap-2">
                               <RefreshCcw className="h-4 w-4" />
                               SketchUp Renovações
                             </div>
                           </SelectItem>
                           <SelectItem value="chaos_renewed">
                             <div className="flex items-center gap-2">
                               <RefreshCcw className="h-4 w-4" />
                               Chaos Renovações
                             </div>
                           </SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     {newPrize.criteria_type && newPrize.criteria_type !== "none" && (
                       <>
                         <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-2">
                             <Label htmlFor="criteria_target">Meta</Label>
                             <Input
                               id="criteria_target"
                               type="number"
                               min="0"
                               step={newPrize.criteria_type === "sales_amount" ? "1000" : "1"}
                               value={newPrize.criteria_target}
                               onChange={(e) => setNewPrize({ 
                                 ...newPrize, 
                                 criteria_target: parseFloat(e.target.value) || 0
                               })}
                               placeholder={newPrize.criteria_type === "sales_amount" ? "110000" : "7"}
                               required
                             />
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="criteria_period">Período</Label>
                             <Select
                               value={newPrize.criteria_period}
                               onValueChange={(value) => setNewPrize({ ...newPrize, criteria_period: value })}
                             >
                               <SelectTrigger>
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="day">Diário</SelectItem>
                                 <SelectItem value="week">Semanal</SelectItem>
                                 <SelectItem value="month">Mensal</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                         </div>
                         <div className="text-xs text-muted-foreground bg-accent/20 p-2 rounded">
                           💡 O progresso será calculado automaticamente baseado nos relatórios diários
                         </div>
                       </>
                     )}
                   </div>
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

        {/* Edit Prize Dialog */}
        {isGestor && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Editar Prêmio</DialogTitle>
                <DialogDescription>
                  Modifique os detalhes do prêmio
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleEditPrize} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Título</Label>
                  <Input
                    id="edit-title"
                    value={editPrize.title}
                    onChange={(e) => setEditPrize({ ...editPrize, title: e.target.value })}
                    placeholder="Ex: Meta do Mês"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    value={editPrize.description}
                    onChange={(e) => setEditPrize({ ...editPrize, description: e.target.value })}
                    placeholder="Descreva os detalhes do prêmio..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-value_or_bonus">Valor ou Bônus</Label>
                  <Input
                    id="edit-value_or_bonus"
                    value={editPrize.value_or_bonus}
                    onChange={(e) => setEditPrize({ ...editPrize, value_or_bonus: e.target.value })}
                    placeholder="Ex: R$ 1.000 ou 1 dia de folga"
                    required
                  />
                </div>

                 <div className="space-y-2">
                   <Label htmlFor="edit-deadline">Prazo de Validade</Label>
                   <Input
                     id="edit-deadline"
                     type="date"
                     value={editPrize.deadline}
                     onChange={(e) => setEditPrize({ ...editPrize, deadline: e.target.value })}
                     required
                   />
                 </div>

                 {/* Criteria Section */}
                 <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                   <Label className="text-sm font-medium">🎯 Critério de Performance (Opcional)</Label>
                   <p className="text-xs text-muted-foreground">
                     Vincule o prêmio a uma meta específica de performance
                   </p>
                   
                   <div className="space-y-3">
                     <div className="space-y-2">
                       <Label htmlFor="edit-criteria_type">Tipo de Meta</Label>
                       <Select
                         value={editPrize.criteria_type}
                         onValueChange={(value) => setEditPrize({ ...editPrize, criteria_type: value })}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecione um tipo de meta" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="none">Sem critério específico</SelectItem>
                           <SelectItem value="sales_amount">
                             <div className="flex items-center gap-2">
                               <TrendingUp className="h-4 w-4" />
                               Valor de Vendas (R$)
                             </div>
                           </SelectItem>
                           <SelectItem value="onboarding">
                             <div className="flex items-center gap-2">
                               <UserCheck className="h-4 w-4" />
                               Onboardings
                             </div>
                           </SelectItem>
                           <SelectItem value="packs_vendidos">
                             <div className="flex items-center gap-2">
                               <Package className="h-4 w-4" />
                               Packs Vendidos
                             </div>
                           </SelectItem>
                           <SelectItem value="cross_selling">
                             <div className="flex items-center gap-2">
                               <Target className="h-4 w-4" />
                               Cross Selling
                             </div>
                           </SelectItem>
                           <SelectItem value="sketchup_renewed">
                             <div className="flex items-center gap-2">
                               <RefreshCcw className="h-4 w-4" />
                               SketchUp Renovações
                             </div>
                           </SelectItem>
                           <SelectItem value="chaos_renewed">
                             <div className="flex items-center gap-2">
                               <RefreshCcw className="h-4 w-4" />
                               Chaos Renovações
                             </div>
                           </SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     {editPrize.criteria_type && editPrize.criteria_type !== "none" && (
                       <>
                         <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-2">
                             <Label htmlFor="edit-criteria_target">Meta</Label>
                             <Input
                               id="edit-criteria_target"
                               type="number"
                               min="0"
                               step={editPrize.criteria_type === "sales_amount" ? "1000" : "1"}
                               value={editPrize.criteria_target}
                               onChange={(e) => setEditPrize({ 
                                 ...editPrize, 
                                 criteria_target: parseFloat(e.target.value) || 0
                               })}
                               placeholder={editPrize.criteria_type === "sales_amount" ? "110000" : "7"}
                               required
                             />
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="edit-criteria_period">Período</Label>
                             <Select
                               value={editPrize.criteria_period}
                               onValueChange={(value) => setEditPrize({ ...editPrize, criteria_period: value })}
                             >
                               <SelectTrigger>
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="day">Diário</SelectItem>
                                 <SelectItem value="week">Semanal</SelectItem>
                                 <SelectItem value="month">Mensal</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                         </div>
                         <div className="text-xs text-muted-foreground bg-accent/20 p-2 rounded">
                           💡 O progresso será calculado automaticamente baseado nos relatórios diários
                         </div>
                       </>
                     )}
                   </div>
                 </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="edit-is_for_all"
                      checked={editPrize.is_for_all}
                      onCheckedChange={(checked) => 
                        setEditPrize({ ...editPrize, is_for_all: checked as boolean })
                      }
                    />
                    <Label htmlFor="edit-is_for_all">Para toda a equipe</Label>
                  </div>

                  {!editPrize.is_for_all && (
                    <div className="space-y-2">
                      <Label>Destinatários específicos:</Label>
                      <div className="max-h-32 overflow-y-auto space-y-2">
                        {profiles.map((profile) => (
                          <div key={profile.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${profile.user_id}`}
                              checked={editPrize.target_users.includes(profile.user_id)}
                              onCheckedChange={(checked) => 
                                handleEditTargetUserChange(profile.user_id, checked as boolean)
                              }
                            />
                            <Label htmlFor={`edit-${profile.user_id}`} className="text-sm">
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
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting} className="brand-gradient">
                    {submitting ? "Salvando..." : "Salvar Alterações"}
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
                       <div className="flex items-center gap-2">
                         {isGestor && (
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => openEditDialog(prize)}
                             className="h-8 w-8 p-0"
                           >
                             <Edit3 className="h-3 w-3" />
                           </Button>
                         )}
                         <Badge variant={prize.is_for_all ? "secondary" : "outline"}>
                           {prize.is_for_all ? (
                             <Users className="h-3 w-3 mr-1" />
                           ) : (
                             <User className="h-3 w-3 mr-1" />
                           )}
                           {prize.is_for_all ? "Todos" : "Específico"}
                         </Badge>
                       </div>
                     </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {prize.description}
                    </p>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prêmio:</span>
                          <span className="font-medium text-primary">
                            {prize.value_or_bonus?.includes('R$') || prize.value_or_bonus?.includes('$') || /^\d+/.test(prize.value_or_bonus || '') 
                              ? `R$ ${parseFloat(prize.value_or_bonus?.replace(/[R$\s]/g, '') || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : prize.value_or_bonus}
                          </span>
                        </div>
                       {prize.criteria_type && (
                         <div className="flex justify-between">
                           <span className="text-muted-foreground">Meta:</span>
                           <span className="flex items-center gap-2">
                             {getCriteriaIcon(prize.criteria_type)}
                             <span>
                                {prize.criteria_target?.toLocaleString('pt-BR')}
                                {prize.criteria_type === 'sales_amount' ? ' R$' : ''}
                               {' '}({getCriteriaPeriodLabel(prize.criteria_period || 'week')})
                             </span>
                           </span>
                         </div>
                       )}
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

                     {/* Team Progress for Gestors */}
                     {isGestor && (
                       <div className="mt-3 pt-3 border-t">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-sm text-muted-foreground flex items-center gap-1">
                             <Users className="h-3 w-3" />
                             Progresso da Equipe:
                           </span>
                           <span className="text-xs text-muted-foreground">
                             {allUsersProgress.filter(p => p.prizeId === prize.id && p.isAchieved).length}/
                             {allUsersProgress.filter(p => p.prizeId === prize.id).length} concluídos
                           </span>
                         </div>
                         
                          <div className="grid grid-cols-2 gap-2">
                            {allUsersProgress
                              .filter(p => p.prizeId === prize.id)
                              .sort((a, b) => {
                                // First, prioritize those who achieved the prize
                                if (a.isAchieved && !b.isAchieved) return -1;
                                if (!a.isAchieved && b.isAchieved) return 1;
                                // Then sort by progress (highest first)
                                return b.progress - a.progress;
                              })
                              .slice(0, 4)
                              .map((userProgress) => (
                               <div 
                                 key={userProgress.userId}
                                 className="flex items-center justify-between text-xs p-2 rounded border bg-muted/30"
                               >
                                 <span className="font-medium truncate mr-2" title={userProgress.userName}>
                                   {userProgress.userName.split(' ')[0]}
                                 </span>
                                 <div className="flex items-center gap-1">
                                   {userProgress.isAchieved && (
                                     <CheckCircle className="h-3 w-3 text-success" />
                                   )}
                                   <span className={userProgress.isAchieved ? 'text-success font-medium' : ''}>
                                     {userProgress.progress}%
                                   </span>
                                 </div>
                               </div>
                             ))}
                         </div>
                         
                         {allUsersProgress.filter(p => p.prizeId === prize.id).length > 4 && (
                           <div className="mt-2 text-center">
                             <span className="text-xs text-muted-foreground">
                               +{allUsersProgress.filter(p => p.prizeId === prize.id).length - 4} vendedores
                             </span>
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