-- Create user_memories table for explicit memory storage
CREATE TABLE IF NOT EXISTS public.user_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_content TEXT NOT NULL,
  memory_type TEXT DEFAULT 'general',
  embedding vector(768),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own memories"
ON public.user_memories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
ON public.user_memories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
ON public.user_memories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
ON public.user_memories FOR DELETE
USING (auth.uid() = user_id);

-- Create function to search similar memories
CREATE OR REPLACE FUNCTION public.search_similar_memories(
  query_embedding vector,
  user_id_param uuid,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  memory_content text,
  memory_type text,
  similarity double precision,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    user_memories.id,
    user_memories.memory_content,
    user_memories.memory_type,
    1 - (user_memories.embedding <=> query_embedding) AS similarity,
    user_memories.created_at
  FROM user_memories
  WHERE user_memories.user_id = user_id_param
    AND user_memories.embedding IS NOT NULL
    AND 1 - (user_memories.embedding <=> query_embedding) > match_threshold
  ORDER BY user_memories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add index for better vector search performance
CREATE INDEX IF NOT EXISTS user_memories_embedding_idx 
ON public.user_memories 
USING hnsw (embedding vector_cosine_ops);