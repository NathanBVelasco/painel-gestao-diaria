-- Create table for AI chat tone preferences
CREATE TABLE public.ai_chat_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  chat_tone VARCHAR(50) NOT NULL DEFAULT 'amigavel',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one preference per user
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.ai_chat_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own preferences" 
ON public.ai_chat_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
ON public.ai_chat_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.ai_chat_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_chat_preferences_updated_at
BEFORE UPDATE ON public.ai_chat_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();