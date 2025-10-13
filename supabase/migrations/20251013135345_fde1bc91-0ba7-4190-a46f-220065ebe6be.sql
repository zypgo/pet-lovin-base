-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create conversations table
CREATE TABLE public.agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view own conversations"
  ON public.agent_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.agent_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.agent_conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON public.agent_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create messages table with vector embeddings
CREATE TABLE public.agent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  embedding vector(768),  -- Gemini embedding dimension
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view own messages"
  ON public.agent_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON public.agent_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for vector similarity search
CREATE INDEX ON public.agent_messages USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index for conversation lookup
CREATE INDEX idx_agent_messages_conversation ON public.agent_messages(conversation_id, created_at DESC);

-- Create index for user messages
CREATE INDEX idx_agent_messages_user ON public.agent_messages(user_id, created_at DESC);

-- Function to update conversation updated_at
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.agent_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update conversation timestamp
CREATE TRIGGER update_conversation_updated_at
  AFTER INSERT ON public.agent_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- Function to search similar messages using vector similarity
CREATE OR REPLACE FUNCTION public.search_similar_messages(
  query_embedding vector(768),
  user_id_param UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  role TEXT,
  content TEXT,
  tool_calls JSONB,
  similarity FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    agent_messages.id,
    agent_messages.conversation_id,
    agent_messages.role,
    agent_messages.content,
    agent_messages.tool_calls,
    1 - (agent_messages.embedding <=> query_embedding) AS similarity,
    agent_messages.created_at
  FROM agent_messages
  WHERE agent_messages.user_id = user_id_param
    AND agent_messages.embedding IS NOT NULL
    AND 1 - (agent_messages.embedding <=> query_embedding) > match_threshold
  ORDER BY agent_messages.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;