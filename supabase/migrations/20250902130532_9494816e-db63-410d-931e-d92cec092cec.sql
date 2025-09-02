-- Create monthly_targets table for individual seller targets
CREATE TABLE public.monthly_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Enable RLS
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Gestors can insert targets" 
ON public.monthly_targets 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'gestor'
  )
);

CREATE POLICY "Gestors can update targets" 
ON public.monthly_targets 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'gestor'
  )
);

CREATE POLICY "Gestors can view all targets" 
ON public.monthly_targets 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'gestor'
  )
);

CREATE POLICY "Users can view their own targets" 
ON public.monthly_targets 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_monthly_targets_updated_at
BEFORE UPDATE ON public.monthly_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();