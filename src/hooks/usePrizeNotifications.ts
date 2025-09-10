import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Crown, Star, Target, Package } from "lucide-react";

export function usePrizeNotifications() {
  const { toast } = useToast();

  const getCriteriaIcon = (criteriaType: string) => {
    switch (criteriaType) {
      case 'sales': return '💰';
      case 'renewals': return '🔄';
      case 'cross_selling': return '🤝';
      case 'packs': return '📦';
      case 'onboarding': return '👋';
      default: return '🏆';
    }
  };

  useEffect(() => {
    // Listen for prize achievements (when someone wins)
    const achievementsChannel = supabase
      .channel('prize-achievements-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prize_achievements'
        },
        async (payload) => {
          try {
            // Get prize and user details
            const { data: prizeData } = await supabase
              .from('prizes')
              .select('title, criteria_type, value_or_bonus')
              .eq('id', payload.new.prize_id)
              .single();

            const { data: userData } = await supabase
              .from('profiles')
              .select('name')
              .eq('user_id', payload.new.user_id)
              .single();

            if (prizeData && userData) {
              const icon = getCriteriaIcon(prizeData.criteria_type);
              
              toast({
                title: `🏆 Prêmio Conquistado!`,
                description: `${userData.name} conquistou "${prizeData.title}" ${icon}`,
                duration: 5000,
              });
            }
          } catch (error) {
            console.error('Error fetching prize achievement details:', error);
          }
        }
      )
      .subscribe();

    // Listen for prizes being deactivated (closed)
    const prizesChannel = supabase
      .channel('prize-updates-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prizes'
        },
        async (payload) => {
          // Only notify when prize becomes inactive
          if (payload.old?.is_active === true && payload.new?.is_active === false) {
            try {
              // Get achievement details to show winner
              const { data: achievement } = await supabase
                .from('prize_achievements')
                .select('user_id')
                .eq('prize_id', payload.new.id)
                .single();

              if (achievement) {
                // Get user name separately
                const { data: userData } = await supabase
                  .from('profiles')
                  .select('name')
                  .eq('user_id', achievement.user_id)
                  .single();

                if (userData) {
                  const icon = getCriteriaIcon(payload.new.criteria_type);
                  
                  toast({
                    title: "🎯 Prêmio Encerrado",
                    description: `"${payload.new.title}" foi conquistado por ${userData.name} ${icon}`,
                    duration: 4000,
                  });
                }
              }
            } catch (error) {
              console.error('Error fetching prize winner details:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(achievementsChannel);
      supabase.removeChannel(prizesChannel);
    };
  }, [toast]);
}