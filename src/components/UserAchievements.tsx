import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Star, Target, Users, Gift } from "lucide-react";

interface Achievement {
  id: string;
  prize_title: string;
  progress: number;
  achieved_at: string;
}

const getCriteriaIcon = (prizeTitle: string) => {
  const title = prizeTitle.toLowerCase();
  if (title.includes('vendas') || title.includes('aceleração')) return "💰";
  if (title.includes('renovação') || title.includes('renov')) return "🔄";
  if (title.includes('cross') || title.includes('venda cruzada')) return "🎯";
  if (title.includes('pack') || title.includes('pacote')) return "📦";
  if (title.includes('onboarding')) return "🚀";
  return "🏆";
};

export function UserAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) return;

    const fetchAchievements = async () => {
      try {
        console.log('Fetching achievements for user:', profile?.user_id);
        
        // Use edge function for better RLS handling
        const { data: fnData, error: fnErr } = await supabase.functions.invoke('get-user-prizes');
        
        if (fnErr || !fnData) {
          console.error('Edge function error:', fnErr);
          setLoading(false);
          return;
        }

        const prizes = fnData?.prizes || [];
        
        // Filter only won prizes (inactive ones with achievements)
        const formattedAchievements = prizes
          .filter((p: any) => !p.is_active && p.prize_achievements?.[0]?.achieved_at)
          .map((p: any) => ({
            id: p.id,
            prize_title: p.title,
            progress: p.prize_achievements[0].progress,
            achieved_at: p.prize_achievements[0].achieved_at,
          })) as Achievement[];

        setAchievements(formattedAchievements);
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();

    // Listen for new achievements
    const channel = supabase
      .channel('achievements-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prize_achievements',
          filter: `user_id=eq.${profile.user_id}`
        },
        () => {
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
            <Trophy className="h-5 w-5 text-yellow-500" />
            Minhas Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
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
            <Trophy className="h-5 w-5 text-yellow-500" />
            Minhas Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma conquista ainda.</p>
            <p className="text-sm">Continue trabalhando para ganhar seu primeiro prêmio!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Minhas Conquistas ({achievements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">
                  {getCriteriaIcon(achievement.prize_title)}
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800">
                    {achievement.prize_title}
                  </h4>
                  <p className="text-sm text-yellow-600">
                    Conquistado em {new Date(achievement.achieved_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                  {achievement.progress.toFixed(0)}%
                </Badge>
                <div className="text-2xl">🏅</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}