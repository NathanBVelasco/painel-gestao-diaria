-- Drop existing trigger and function to recreate properly
DROP TRIGGER IF EXISTS check_prize_completion_trigger ON daily_reports;
DROP FUNCTION IF EXISTS check_prize_completion();

-- Create the corrected function 
CREATE OR REPLACE FUNCTION public.check_prize_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prize_record RECORD;
  user_progress NUMERIC;
  current_user_name TEXT;
BEGIN
  -- Get user name for notifications
  SELECT name INTO current_user_name 
  FROM profiles 
  WHERE user_id = NEW.user_id;

  -- Check all active prizes to see if this user completed any
  FOR prize_record IN 
    SELECT id, title, criteria_type, criteria_target, criteria_period, target_users, is_for_all
    FROM prizes 
    WHERE is_active = true 
    AND (deadline IS NULL OR deadline >= CURRENT_DATE)
  LOOP
    -- Check if this prize applies to the current user
    IF NOT (prize_record.is_for_all OR 
           (prize_record.target_users IS NOT NULL AND 
            NEW.user_id::text = ANY(prize_record.target_users::text[]))) THEN
      CONTINUE;
    END IF;

    -- Calculate user progress for this prize
    user_progress := 0;
    
    IF prize_record.criteria_type = 'sales_amount' THEN
      IF prize_record.criteria_period = 'day' THEN
        SELECT COALESCE(NEW.sales_amount, 0) INTO user_progress;
      ELSIF prize_record.criteria_period = 'week' THEN
        SELECT COALESCE(SUM(sales_amount), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= CURRENT_DATE - INTERVAL '7 days';
      ELSIF prize_record.criteria_period = 'month' THEN
        SELECT COALESCE(SUM(sales_amount), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= DATE_TRUNC('month', CURRENT_DATE);
      END IF;
      
    ELSIF prize_record.criteria_type = 'renewals' THEN
      IF prize_record.criteria_period = 'day' THEN
        SELECT COALESCE(NEW.chaos_renewed + NEW.sketchup_renewed, 0) INTO user_progress;
      ELSIF prize_record.criteria_period = 'week' THEN
        SELECT COALESCE(SUM(chaos_renewed + sketchup_renewed), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= CURRENT_DATE - INTERVAL '7 days';
      ELSIF prize_record.criteria_period = 'month' THEN
        SELECT COALESCE(SUM(chaos_renewed + sketchup_renewed), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= DATE_TRUNC('month', CURRENT_DATE);
      END IF;
      
    ELSIF prize_record.criteria_type = 'cross_selling' THEN
      IF prize_record.criteria_period = 'day' THEN
        SELECT COALESCE(NEW.cross_selling, 0) INTO user_progress;
      ELSIF prize_record.criteria_period = 'week' THEN
        SELECT COALESCE(SUM(cross_selling), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= CURRENT_DATE - INTERVAL '7 days';
      ELSIF prize_record.criteria_period = 'month' THEN
        SELECT COALESCE(SUM(cross_selling), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= DATE_TRUNC('month', CURRENT_DATE);
      END IF;
      
    ELSIF prize_record.criteria_type = 'packs' THEN
      IF prize_record.criteria_period = 'day' THEN
        SELECT COALESCE(NEW.packs_vendidos, 0) INTO user_progress;
      ELSIF prize_record.criteria_period = 'week' THEN
        SELECT COALESCE(SUM(packs_vendidos), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= CURRENT_DATE - INTERVAL '7 days';
      ELSIF prize_record.criteria_period = 'month' THEN
        SELECT COALESCE(SUM(packs_vendidos), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= DATE_TRUNC('month', CURRENT_DATE);
      END IF;
      
    ELSIF prize_record.criteria_type = 'onboarding' THEN
      IF prize_record.criteria_period = 'day' THEN
        SELECT COALESCE(NEW.onboarding, 0) INTO user_progress;
      ELSIF prize_record.criteria_period = 'week' THEN
        SELECT COALESCE(SUM(onboarding), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= CURRENT_DATE - INTERVAL '7 days';
      ELSIF prize_record.criteria_period = 'month' THEN
        SELECT COALESCE(SUM(onboarding), 0) INTO user_progress
        FROM daily_reports 
        WHERE user_id = NEW.user_id 
        AND date >= DATE_TRUNC('month', CURRENT_DATE);
      END IF;
    END IF;

    -- Check if user completed the prize (>=100% progress)
    IF user_progress >= prize_record.criteria_target THEN
      -- Insert achievement record
      INSERT INTO prize_achievements (user_id, prize_id, progress)
      VALUES (NEW.user_id, prize_record.id, (user_progress / prize_record.criteria_target) * 100)
      ON CONFLICT (user_id, prize_id) DO NOTHING;
      
      -- Deactivate the prize (first to complete wins and closes prize for everyone)
      UPDATE prizes 
      SET is_active = false, updated_at = now()
      WHERE id = prize_record.id;
      
      -- Log the completion
      INSERT INTO profile_access_log (accessed_by, accessed_profile, access_type)
      VALUES (NEW.user_id, NEW.user_id, CONCAT('prize_won:', prize_record.id, ':', prize_record.title));
      
      RAISE NOTICE 'Prize completed: % won prize % with progress %', current_user_name, prize_record.title, user_progress;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER check_prize_completion_trigger
  AFTER INSERT OR UPDATE ON daily_reports
  FOR EACH ROW EXECUTE FUNCTION check_prize_completion();

-- Process the missed achievement for Larissa Ribeiro's "Aceleração" prize
-- First, let's get her current weekly total and record the achievement
INSERT INTO prize_achievements (user_id, prize_id, progress)
SELECT 
  '0c8d113d-7cc7-4b8e-96d9-d7da6bcd88ae'::uuid,
  '478e257c-1b79-468f-b256-0ac4bf51b24b'::uuid,
  GREATEST(100, (SUM(dr.sales_amount) / 90000.0) * 100)
FROM daily_reports dr
WHERE dr.user_id = '0c8d113d-7cc7-4b8e-96d9-d7da6bcd88ae'
AND dr.date >= '2025-09-02'  -- Start of that week
AND dr.date <= '2025-09-08'  -- End of that week
ON CONFLICT (user_id, prize_id) DO NOTHING;

-- Deactivate the "Aceleração" prize since it should have been won
UPDATE prizes 
SET is_active = false, updated_at = now()
WHERE id = '478e257c-1b79-468f-b256-0ac4bf51b24b';