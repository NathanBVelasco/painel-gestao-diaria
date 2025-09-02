-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Add attachment fields to ai_conversations table
ALTER TABLE public.ai_conversations 
ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN attachment_urls TEXT[] DEFAULT '{}';

-- Create storage policies for chat attachments
CREATE POLICY "Users can upload their own chat attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own chat attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Chat attachments are publicly viewable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'chat-attachments');