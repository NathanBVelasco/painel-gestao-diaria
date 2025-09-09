import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useActivePrizesCount() {
  const [count, setCount] = useState(0);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) {
      setCount(0);
      return;
    }

    const fetchActivePrizesCount = async () => {
      try {
        let query = supabase
          .from('prizes')
          .select('id, is_for_all, target_users, deadline')
          .eq('is_active', true);

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching active prizes count:', error);
          return;
        }

        if (!data) {
          setCount(0);
          return;
        }

        // Filter out expired prizes
        const activePrizes = data.filter(prize => {
          if (!prize.deadline) return true; // No deadline means never expires
          const deadline = new Date(prize.deadline);
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Start of today
          deadline.setHours(0, 0, 0, 0); // Start of deadline day
          return deadline >= today; // Include if deadline is today or future
        });

        // Se for gestor, mostra todos os prêmios ativos e não expirados
        if (profile.role === 'gestor') {
          setCount(activePrizes.length);
          return;
        }

        // Se for vendedor, mostra apenas os prêmios destinados a ele e não expirados
        const relevantPrizes = activePrizes.filter(prize => {
          return prize.is_for_all || (prize.target_users && prize.target_users.includes(profile.user_id));
        });

        setCount(relevantPrizes.length);
      } catch (error) {
        console.error('Error fetching active prizes count:', error);
      }
    };

    fetchActivePrizesCount();

    // Set up real-time subscription for prizes changes
    const channel = supabase
      .channel('prizes-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prizes'
        },
        () => {
          fetchActivePrizesCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return count;
}