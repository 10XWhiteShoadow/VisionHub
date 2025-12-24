-- Create table for background removal history
CREATE TABLE public.background_removal_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_image_url TEXT NOT NULL,
  processed_image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.background_removal_history ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (no auth required for this feature)
CREATE POLICY "Anyone can view background removal history" 
ON public.background_removal_history 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert background removal history" 
ON public.background_removal_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete background removal history" 
ON public.background_removal_history 
FOR DELETE 
USING (true);

-- Create storage bucket for background removal images
INSERT INTO storage.buckets (id, name, public) VALUES ('background-removal', 'background-removal', true);

-- Create storage policies
CREATE POLICY "Anyone can view background removal images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'background-removal');

CREATE POLICY "Anyone can upload background removal images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'background-removal');

CREATE POLICY "Anyone can delete background removal images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'background-removal');