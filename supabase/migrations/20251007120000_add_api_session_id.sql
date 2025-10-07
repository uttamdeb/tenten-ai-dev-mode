-- Add API session id columns for tracking external session ids
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS api_session_id INTEGER;

ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS api_session_id INTEGER;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_api_session_id ON public.chat_sessions(api_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_api_session_id ON public.chat_messages(api_session_id);
