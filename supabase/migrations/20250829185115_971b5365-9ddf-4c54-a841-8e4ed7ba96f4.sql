-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('vendedor', 'gestor');

-- Create enum for product types
CREATE TYPE public.product_type AS ENUM ('trimble', 'chaos');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'vendedor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily reports table for Daylin functionality
CREATE TABLE public.daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Start of day fields
  started_at TIMESTAMP WITH TIME ZONE,
  mood TEXT,
  sketchup_to_renew INTEGER DEFAULT 0,
  chaos_to_renew INTEGER DEFAULT 0,
  forecast_amount DECIMAL(10,2) DEFAULT 0,
  daily_strategy TEXT,
  -- End of day fields
  ended_at TIMESTAMP WITH TIME ZONE,
  difficulties TEXT,
  sketchup_renewed INTEGER DEFAULT 0,
  chaos_renewed INTEGER DEFAULT 0,
  sales_amount DECIMAL(10,2) DEFAULT 0,
  cross_selling INTEGER DEFAULT 0,
  onboarding INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create prizes table
CREATE TABLE public.prizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  value_or_bonus TEXT,
  deadline DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_users UUID[],
  is_for_all BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prize achievements table
CREATE TABLE public.prize_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prize_id UUID NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress DECIMAL(5,2) DEFAULT 0,
  UNIQUE(prize_id, user_id)
);

-- Create AI conversations table
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user preferences table
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  daylin_reminder_time TIME DEFAULT '09:00:00',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Gestors can view all profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'gestor'
  )
);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for daily reports
CREATE POLICY "Users can view their own reports" ON public.daily_reports
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Gestors can view all reports" ON public.daily_reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'gestor'
  )
);

CREATE POLICY "Users can insert their own reports" ON public.daily_reports
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" ON public.daily_reports
FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for prizes
CREATE POLICY "Everyone can view active prizes" ON public.prizes
FOR SELECT USING (is_active = true);

CREATE POLICY "Gestors can insert prizes" ON public.prizes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'gestor'
  )
);

CREATE POLICY "Gestors can update prizes" ON public.prizes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'gestor'
  )
);

-- Create RLS policies for prize achievements
CREATE POLICY "Users can view their own achievements" ON public.prize_achievements
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Gestors can view all achievements" ON public.prize_achievements
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'gestor'
  )
);

CREATE POLICY "Users can insert their own achievements" ON public.prize_achievements
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for AI conversations
CREATE POLICY "Users can view their own conversations" ON public.ai_conversations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON public.ai_conversations
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user preferences
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  return NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_reports_updated_at
  BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prizes_updated_at
  BEFORE UPDATE ON public.prizes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Insert default user preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create helper function to check if user is gestor
CREATE OR REPLACE FUNCTION public.is_gestor(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = is_gestor.user_id AND role = 'gestor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;