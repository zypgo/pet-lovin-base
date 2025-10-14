-- Add result column to agent_messages table to store tool execution results
ALTER TABLE public.agent_messages 
ADD COLUMN result jsonb;