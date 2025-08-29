import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  DollarSign,
  Target,
  Users,
  Crown,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type SortBy = "vendas" | "renovado_trimble" | "renovado_chaos" | "cross_selling" | "onboarding";

interface RankingUser {
  user_id: string;
  name: string;
  vendas: number;
  renovado_trimble: { percent: number; quantity: number };
  renovado_chaos: { percent: number; quantity: number };
  cross_selling: number;
  onboarding: number;
  position_vendas: number;
  position_renovado_trimble: number;
  position_renovado_chaos: number;
  position_cross_selling: number;
  position_onboarding: number;
}

const Ranking = () => {
  const { profile, isGestor } = useAuth();
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("vendas");
  const [loading, setLoading] = useState(true);
  const [gapToLeader, setGapToLeader] = useState<number>(0);

  useEffect(() => {
    loadRankings();
  }, [profile, isGestor]);

  const loadRankings = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      // Get all profiles (if gestor) or just current user
      let profilesQuery = supabase.from("profiles").select("user_id, name");
      
      if (!isGestor) {
        profilesQuery = profilesQuery.eq("user_id", profile.user_id);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;

      if (profilesError) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os perfis",
          variant: "destructive",
        });
        return;
      }

      // Get daily reports for the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: reports, error: reportsError } = await supabase
        .from("daily_reports")
        .select("*")
        .gte("date", startOfMonth.toISOString().split('T')[0]);

      if (reportsError) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os relatórios",
          variant: "destructive",
        });
        return;
      }

      // Calculate metrics for each user
      const userMetrics = profiles?.map(profile => {
        const userReports = reports?.filter(r => r.user_id === profile.user_id) || [];

        const metrics = userReports.reduce(
          (acc, report) => {
            acc.vendas += report.sales_amount || 0;
            acc.sketchup_to_renew += report.sketchup_to_renew || 0;
            acc.sketchup_renewed += report.sketchup_renewed || 0;
            acc.chaos_to_renew += report.chaos_to_renew || 0;
            acc.chaos_renewed += report.chaos_renewed || 0;
            acc.cross_selling += report.cross_selling || 0;
            acc.onboarding += report.onboarding || 0;
            return acc;
          },
          {
            vendas: 0,
            sketchup_to_renew: 0,
            sketchup_renewed: 0,
            chaos_to_renew: 0,
            chaos_renewed: 0,
            cross_selling: 0,
            onboarding: 0,
          }
        );

        return {
          user_id: profile.user_id,
          name: profile.name,
          vendas: metrics.vendas,
          renovado_trimble: {
            percent: metrics.sketchup_to_renew > 0 
              ? (metrics.sketchup_renewed / metrics.sketchup_to_renew) * 100 
              : 0,
            quantity: metrics.sketchup_renewed,
          },
          renovado_chaos: {
            percent: metrics.chaos_to_renew > 0 
              ? (metrics.chaos_renewed / metrics.chaos_to_renew) * 100 
              : 0,
            quantity: metrics.chaos_renewed,
          },
          cross_selling: metrics.cross_selling,
          onboarding: metrics.onboarding,
          position_vendas: 0,
          position_renovado_trimble: 0,
          position_renovado_chaos: 0,
          position_cross_selling: 0,
          position_onboarding: 0,
        };
      }) || [];

      // Calculate positions for each metric
      const calculatePositions = (users: any[], key: string) => {
        const getValue = (user: any) => {
          if (key.includes('renovado')) {
            return user[key].percent;
          }
          return user[key];
        };

        return [...users]
          .sort((a, b) => getValue(b) - getValue(a))
          .map((user, index) => ({
            ...user,
            [`position_${key}`]: index + 1,
          }));
      };

      let rankedUsers = userMetrics;
      rankedUsers = calculatePositions(rankedUsers, 'vendas');
      rankedUsers = calculatePositions(rankedUsers, 'renovado_trimble');
      rankedUsers = calculatePositions(rankedUsers, 'renovado_chaos');
      rankedUsers = calculatePositions(rankedUsers, 'cross_selling');
      rankedUsers = calculatePositions(rankedUsers, 'onboarding');

      setRankings(rankedUsers);

      // Calculate gap to leader for current user
      if (!isGestor && rankedUsers.length > 0) {
        const currentUser = rankedUsers.find(u => u.user_id === profile.user_id);
        if (currentUser) {
          const leader = rankedUsers.reduce((prev, current) => 
            (current.vendas > prev.vendas) ? current : prev
          );
          setGapToLeader(leader.vendas - currentUser.vendas);
        }
      }

    } catch (error) {
      console.error("Error loading rankings:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSortedRankings = () => {
    return [...rankings].sort((a, b) => {
      switch (sortBy) {
        case "vendas":
          return b.vendas - a.vendas;
        case "renovado_trimble":
          return b.renovado_trimble.percent - a.renovado_trimble.percent;
        case "renovado_chaos":
          return b.renovado_chaos.percent - a.renovado_chaos.percent;
        case "cross_selling":
          return b.cross_selling - a.cross_selling;
        case "onboarding":
          return b.onboarding - a.onboarding;
        default:
          return 0;
      }
    });
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <Trophy className="h-4 w-4 text-muted-foreground" />;
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (position === 2) return "bg-gray-100 text-gray-800 border-gray-200";
    if (position === 3) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-muted text-muted-foreground";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCurrentUserPosition = (metric: string) => {
    const currentUser = rankings.find(u => u.user_id === profile?.user_id);
    if (!currentUser) return 0;
    
    switch (metric) {
      case 'vendas': return currentUser.position_vendas || 0;
      case 'renovado_trimble': return currentUser.position_renovado_trimble || 0;
      case 'renovado_chaos': return currentUser.position_renovado_chaos || 0;
      case 'cross_selling': return currentUser.position_cross_selling || 0;
      case 'onboarding': return currentUser.position_onboarding || 0;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-muted rounded"></div>
            <div className="lg:col-span-2 h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const sortedRankings = getSortedRankings();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🏆 Ranking
          </h1>
          <p className="text-muted-foreground">
            {isGestor ? "Acompanhe a performance da equipe" : "Veja sua posição no ranking"}
          </p>
        </div>

        {isGestor && (
          <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="renovado_trimble">% Renovado Trimble</SelectItem>
              <SelectItem value="renovado_chaos">% Renovado Chaos</SelectItem>
              <SelectItem value="cross_selling">Cross Selling</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Positions (for vendedor) or Top 3 (for gestor) */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isGestor ? (
                <>
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Top 3 - {sortBy.replace('_', ' ').replace('renovado', '% Renovado')}
                </>
              ) : (
                <>
                  <Target className="h-5 w-5 text-primary" />
                  Suas Posições
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isGestor ? "Os líderes do ranking atual" : "Sua classificação nos indicadores"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isGestor ? (
              <div className="space-y-4">
                {sortedRankings.slice(0, 3).map((user, index) => (
                  <div key={user.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {getPositionIcon(index + 1)}
                      <span className="font-semibold">#{index + 1}</span>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sortBy === 'vendas' && formatCurrency(user.vendas)}
                        {sortBy === 'renovado_trimble' && `${user.renovado_trimble.percent.toFixed(1)}%`}
                        {sortBy === 'renovado_chaos' && `${user.renovado_chaos.percent.toFixed(1)}%`}
                        {sortBy === 'cross_selling' && user.cross_selling}
                        {sortBy === 'onboarding' && user.onboarding}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Vendas</span>
                  </div>
                  <Badge className={getPositionBadge(getCurrentUserPosition('vendas'))}>
                    #{getCurrentUserPosition('vendas')}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">% Renovado Trimble</span>
                  </div>
                  <Badge className={getPositionBadge(getCurrentUserPosition('renovado_trimble'))}>
                    #{getCurrentUserPosition('renovado_trimble')}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">% Renovado Chaos</span>
                  </div>
                  <Badge className={getPositionBadge(getCurrentUserPosition('renovado_chaos'))}>
                    #{getCurrentUserPosition('renovado_chaos')}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Cross Selling</span>
                  </div>
                  <Badge className={getPositionBadge(getCurrentUserPosition('cross_selling'))}>
                    #{getCurrentUserPosition('cross_selling')}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Onboarding</span>
                  </div>
                  <Badge className={getPositionBadge(getCurrentUserPosition('onboarding'))}>
                    #{getCurrentUserPosition('onboarding')}
                  </Badge>
                </div>

                {!isGestor && gapToLeader > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 text-warning">
                      <Target className="h-4 w-4" />
                      <span className="font-medium text-sm">Gap to Leader</span>
                    </div>
                    <p className="text-sm text-warning/80 mt-1">
                      Faltam {formatCurrency(gapToLeader)} para alcançar o 1º lugar
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full Ranking */}
        <Card className="lg:col-span-2 card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Ranking Completo
              {!isGestor && " - Vendas"}
            </CardTitle>
            <CardDescription>
              {isGestor 
                ? `Classificação por ${sortBy.replace('_', ' ').replace('renovado', '% Renovado')}`
                : "Classificação geral por vendas do mês"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(isGestor ? sortedRankings : rankings.sort((a, b) => b.vendas - a.vendas)).map((user, index) => (
                <div
                  key={user.user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                    user.user_id === profile?.user_id
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-[60px]">
                    {getPositionIcon(index + 1)}
                    <Badge className={getPositionBadge(index + 1)}>
                      #{index + 1}
                    </Badge>
                  </div>

                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-medium">{user.name}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-2 text-sm text-muted-foreground">
                      <div>
                        <span className="block text-xs">Vendas</span>
                        <span className="font-medium text-foreground">
                          {formatCurrency(user.vendas)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs">Trimble</span>
                        <span className="font-medium text-foreground">
                          {user.renovado_trimble.percent.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs">Chaos</span>
                        <span className="font-medium text-foreground">
                          {user.renovado_chaos.percent.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs">Cross Selling</span>
                        <span className="font-medium text-foreground">
                          {user.cross_selling}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs">Onboarding</span>
                        <span className="font-medium text-foreground">
                          {user.onboarding}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {rankings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum dado disponível ainda</p>
                  <p className="text-xs">Complete alguns Daylins para aparecer no ranking</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Ranking;