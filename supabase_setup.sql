-- 1. Create folders table
CREATE TABLE public.folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create media table
CREATE TABLE public.media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('photo', 'youtube')),
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS) on tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for Folders
-- Anyone can view folders
CREATE POLICY "Enable read access for all users" ON public.folders FOR SELECT USING (true);
-- Only authenticated users (Admin) can insert/update/delete folders
CREATE POLICY "Enable insert for authenticated users only" ON public.folders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.folders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.folders FOR DELETE TO authenticated USING (true);

-- 5. Create Policies for Media
-- Anyone can view media
CREATE POLICY "Enable read access for all users" ON public.media FOR SELECT USING (true);
-- Only authenticated users (Admin) can insert/update/delete media
CREATE POLICY "Enable insert for authenticated users only" ON public.media FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.media FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.media FOR DELETE TO authenticated USING (true);

-- 6. Storage Setup
-- Insert a new bucket called 'gallery_images' which is publicly accessible
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery_images', 'gallery_images', true);

-- Enable RLS for storage.objects
-- Allow public access to view images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'gallery_images');
-- Allow authenticated users to upload/modify images
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery_images');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'gallery_images');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'gallery_images');
