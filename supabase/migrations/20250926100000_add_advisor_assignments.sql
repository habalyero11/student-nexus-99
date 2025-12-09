-- Create advisor_assignments table for multiple section/strand assignments
CREATE TABLE public.advisor_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advisor_id UUID NOT NULL REFERENCES public.advisors(id) ON DELETE CASCADE,
  year_level year_level NOT NULL,
  section TEXT NOT NULL,
  strand strand,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Ensure unique assignment per advisor-year_level-section-strand combination
  UNIQUE(advisor_id, year_level, section, strand)
);

-- Enable RLS
ALTER TABLE public.advisor_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advisor_assignments
CREATE POLICY "Advisors can view their own assignments" ON public.advisor_assignments
  FOR SELECT USING (
    advisor_id IN (
      SELECT a.id FROM public.advisors a
      JOIN public.profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all assignments" ON public.advisor_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for timestamp updates
CREATE TRIGGER update_advisor_assignments_updated_at
  BEFORE UPDATE ON public.advisor_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_advisor_assignments_advisor_id ON public.advisor_assignments(advisor_id);
CREATE INDEX idx_advisor_assignments_year_section ON public.advisor_assignments(year_level, section);