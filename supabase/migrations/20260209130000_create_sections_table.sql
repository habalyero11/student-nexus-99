-- Create sections table for dynamic section management
CREATE TABLE public.sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    year_level year_level NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Unique constraint: same section name cannot exist twice in the same year level
    CONSTRAINT unique_section_per_year_level UNIQUE (name, year_level)
);

-- Create index for faster lookups by year level
CREATE INDEX idx_sections_year_level ON public.sections(year_level);

-- Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can manage sections, but everyone can view
CREATE POLICY "Everyone can view sections" ON public.sections
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can create sections" ON public.sections
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update sections" ON public.sections
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete sections" ON public.sections
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_sections_updated_at
    BEFORE UPDATE ON public.sections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Populate with existing hardcoded sections
INSERT INTO public.sections (name, year_level) VALUES
    -- Grade 7
    ('Archimedes', '7'),
    ('Laplace', '7'),
    ('Miletus', '7'),
    -- Grade 8
    ('Herschel', '8'),
    ('Linnaeus', '8'),
    ('Pythagoras', '8'),
    -- Grade 9
    ('Ptolemy', '9'),
    ('Euclid', '9'),
    ('Pascal', '9'),
    -- Grade 10
    ('Hypatia', '10'),
    ('Euler', '10'),
    ('Lagrange', '10'),
    -- Grade 11
    ('Maxwell', '11'),
    -- Grade 12
    ('Einstein', '12'),
    ('Newton', '12'),
    ('Aristotle', '12'),
    ('Pasteur', '12');

-- Add comment
COMMENT ON TABLE public.sections IS 'Dynamic section management - replaces hardcoded sections in frontend';
