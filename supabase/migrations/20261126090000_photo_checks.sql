-- Photo check tester: every answer photo a tester checks, with TenTen's decision.
-- Testers see their own checks; signed-in 10minuteschool.com accounts see everyone's.

CREATE TABLE IF NOT EXISTS public.photo_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  language TEXT,
  session_id TEXT,
  question_key TEXT,
  source TEXT,
  edited BOOLEAN NOT NULL DEFAULT false,
  mime TEXT,
  bytes INTEGER,
  original_bytes INTEGER,
  resized BOOLEAN NOT NULL DEFAULT false,
  width INTEGER,
  height INTEGER,
  storage_path TEXT,
  http_status INTEGER,
  latency_ms INTEGER,
  status TEXT,
  verdict TEXT,
  confidence DOUBLE PRECISION,
  should_warn BOOLEAN,
  message TEXT,
  reason TEXT,
  probabilities JSONB,
  model TEXT,
  input_tokens INTEGER,
  trace_id TEXT,
  error TEXT,
  response JSONB,
  uploaded_at TIMESTAMPTZ,
  answer_order INTEGER
);

CREATE INDEX IF NOT EXISTS idx_photo_checks_created_at ON public.photo_checks (created_at DESC);

ALTER TABLE public.photo_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add their own photo checks" ON public.photo_checks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own photo checks" ON public.photo_checks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own photo checks" ON public.photo_checks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "10MS accounts can view all photo checks" ON public.photo_checks
  FOR SELECT TO authenticated USING ((auth.jwt() ->> 'email') ILIKE '%@10minuteschool.com');

CREATE TABLE IF NOT EXISTS public.photo_check_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  endpoint TEXT,
  answers JSONB NOT NULL
);

ALTER TABLE public.photo_check_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can add their own photo check submissions" ON public.photo_check_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own photo check submissions" ON public.photo_check_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Photos: private bucket, one folder per tester (photo-checks/<user id>/<check id>).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('photo-checks', 'photo-checks', false, 20971520)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own photo check photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photo-checks' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view their own photo check photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'photo-checks' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "10MS accounts can view all photo check photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'photo-checks' AND (auth.jwt() ->> 'email') ILIKE '%@10minuteschool.com');
