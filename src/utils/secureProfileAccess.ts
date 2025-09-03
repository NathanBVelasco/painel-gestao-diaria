// Secure utility functions for profile access
import { supabase } from "@/integrations/supabase/client";

/**
 * SECURE: Get team member profiles for gestors (NO EMAIL ACCESS)
 * This function uses a hardened database function that only returns safe fields
 * CRITICAL: Emails are completely protected and never exposed
 */
export const getTeamProfilesForGestor = async () => {
  try {
    const { data, error } = await supabase.rpc('get_secure_team_basic_info');
    
    if (error) {
      console.error('Error fetching secure team profiles:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Security error in getTeamProfilesForGestor:', error);
    throw new Error('Access denied or insufficient permissions');
  }
};

/**
 * SECURE: Get basic team info for ranking and general purposes
 * This function uses a hardened database function that only returns safe fields (NO EMAILS)
 * Available only to authenticated gestors
 */
export const getBasicTeamInfo = async () => {
  try {
    const { data, error } = await supabase.rpc('get_secure_team_basic_info');
    
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
 * SECURE: Get user's own email address only
 * Users can only access their own email, never others'
 */
export const getOwnEmail = async () => {
  try {
    const { data, error } = await supabase.rpc('get_own_email');
    
    if (error) {
      console.error('Error fetching own email:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Security error in getOwnEmail:', error);
    throw new Error('Failed to fetch email information');
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