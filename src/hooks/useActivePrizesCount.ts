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
          .select('id, is_for_all, target_users')
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

        // Se for gestor, mostra todos os prêmios ativos
        if (profile.role === 'gestor') {
          setCount(data.length);
          return;
        }

        // Se for vendedor, mostra apenas os prêmios destinados a ele
        const relevantPrizes = data.filter(prize => {
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