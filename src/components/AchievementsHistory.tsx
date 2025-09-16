import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Achievement {
  id: string;
  progress: number;
  achieved_at: string;
  prize_id: string;
  user_id: string;
  prize_title: string;
  prize_description: string;
  prize_value: string;
  winner_name?: string;
}

export function AchievementsHistory() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const getCriteriaIcon = (prizeTitle: string): string => {
    if (prizeTitle.toLowerCase().includes('venda')) return '💰';
    if (prizeTitle.toLowerCase().includes('renovação')) return '🔄';
    if (prizeTitle.toLowerCase().includes('cross')) return '📈';
    if (prizeTitle.toLowerCase().includes('pack')) return '📦';
    if (prizeTitle.toLowerCase().includes('onboard')) return '🚀';
    return '🏆';
  };

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!profile) return;

      try {
        if (profile.role === 'gestor') {
          // Gestor uses edge function to get all team achievements with winner info
          const { data: fnData, error: fnErr } = await supabase.functions.invoke('get-user-prizes');
          
          if (fnErr || !fnData) {
            console.error('Edge function error:', fnErr);
            setLoading(false);
            return;
          }

          const prizes = fnData?.prizes || [];
          
          // Get all won prizes (inactive ones with achievements) for team
          const transformedData: Achievement[] = [];
          
          prizes
            .filter((p: any) => !p.is_active && p.prize_achievements?.[0]?.achieved_at)
            .forEach((p: any) => {
              p.prize_achievements.forEach((ach: any) => {
                if (ach.achieved_at) {
                  transformedData.push({
                    id: `${p.id}-${ach.user_id}`,
                    progress: ach.progress,
                    achieved_at: ach.achieved_at,
                    prize_id: p.id,
                    user_id: ach.user_id,
                    prize_title: p.title,
                    prize_description: p.description,
                    prize_value: p.value_or_bonus,
                    winner_name: ach.profiles?.name || 'Usuário'
                  });
                }
              });
            });

          setAchievements(transformedData.sort((a, b) => 
            new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime()
          ));
        } else {
          // Seller uses edge function to get their own achievements  
          const { data: fnData, error: fnErr } = await supabase.functions.invoke('get-user-prizes');
          
          if (fnErr || !fnData) {
            console.error('Edge function error:', fnErr);
            setLoading(false);
            return;
          }

          const prizes = fnData?.prizes || [];
          
          const transformedData = prizes
            .filter((p: any) => !p.is_active && p.prize_achievements?.[0]?.achieved_at)
            .map((p: any) => ({
              id: `${p.id}-${profile.user_id}`,
              progress: p.prize_achievements[0].progress,
              achieved_at: p.prize_achievements[0].achieved_at,
              prize_id: p.id,
              user_id: profile.user_id,
              prize_title: p.title,
              prize_description: p.description,
              prize_value: p.value_or_bonus
            }));

          setAchievements(transformedData);
        }
      } catch (error) {
        console.error('Error fetching achievements history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();

    // Setup real-time subscription
    const channel = supabase
      .channel('achievements-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'prize_achievements' },
        () => {
          console.log('Achievement changed, refetching...');
          fetchAchievements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Histórico de Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Carregando conquistas...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Histórico de Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {profile?.role === 'gestor' 
              ? 'Nenhuma conquista da equipe ainda.' 
              : 'Você ainda não conquistou nenhum prêmio.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Histórico de Conquistas
          <Badge variant="secondary">{achievements.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
                {getCriteriaIcon(achievement.prize_title)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {achievement.prize_title}
                    </h3>
                    {profile?.role === 'gestor' && achievement.winner_name && (
                      <p className="text-sm text-primary font-medium">
                        🏆 Conquistado por {achievement.winner_name}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {achievement.prize_description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(achievement.achieved_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {achievement.progress.toFixed(0)}% completado
                      </div>
                    </div>
                  </div>
                  
                  <Badge className="bg-green-500 text-white ml-4">
                    {achievement.prize_value || 'Conquistado'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}