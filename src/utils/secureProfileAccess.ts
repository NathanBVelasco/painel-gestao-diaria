// Secure utility functions for profile access
import { supabase } from "@/integrations/supabase/client";

/**
 * Securely get team member profiles for gestors
 * This function uses a database function that only returns safe fields (no emails)
 */
export const getTeamProfilesForGestor = async () => {
  try {
    const { data, error } = await supabase.rpc('get_team_profiles_for_gestor');
    
    if (error) {
      console.error('Error fetching team profiles:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Security error in getTeamProfilesForGestor:', error);
    throw new Error('Access denied or insufficient permissions');
  }
};

/**
 * Securely get basic team info for ranking and general purposes
 * This function uses a database function that only returns safe fields (no emails)
 * Available to all authenticated users
 */
export const getBasicTeamInfo = async () => {
  try {
    const { data, error } = await supabase.rpc('get_basic_team_info');
    
    if (error) {
      console.error('Error fetching basic team info:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Security error in getBasicTeamInfo:', error);
    throw new Error('Failed to fetch team information');
  }
};

/**
 * Get only public profile information (name and role) for a specific user
 * Used when gestors need basic info about team members
 */
export const getPublicProfileInfo = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, name, role') // Only safe fields
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching public profile info:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getPublicProfileInfo:', error);
    throw error;
  }
};