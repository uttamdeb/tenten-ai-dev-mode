-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table  
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  question TEXT NOT NULL,
  webhook_request JSONB,
  webhook_response JSONB,
  final_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_feedback table
CREATE TABLE public.message_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'needs_improvement')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.chat_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.chat_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.chat_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for chat_messages
CREATE POLICY "Users can view their own messages" 
ON public.chat_messages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages" 
ON public.chat_messages 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for message_feedback
CREATE POLICY "Users can view their own feedback" 
ON public.message_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feedback" 
ON public.message_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" 
ON public.message_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_message_feedback_message_id ON public.message_feedback(message_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();