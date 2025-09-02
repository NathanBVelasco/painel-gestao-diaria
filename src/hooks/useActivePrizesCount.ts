import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useActivePrizesCount() {
  const [count, setCount] = useState(0);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile || profile.role !== 'gestor') {
      setCount(0);
      return;
    }

    const fetchActivePrizesCount = async () => {
      try {
        const { data, error } = await supabase
          .from('prizes')
          .select('id')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching active prizes count:', error);
          return;
        }

        setCount(data?.length || 0);
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