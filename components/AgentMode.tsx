

import React, { useState, useRef, useEffect } from 'react';
import Spinner from './Spinner';
import { SocialPost, EditedImageResult } from '../types';
import PetInfoDisplay from './PetInfoDisplay';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { supabase } from '../src/integrations/supabase/client';
import { useAuth } from '../src/contexts/AuthContext';

marked.setOptions({ gfm: true });

// --- Result Display Components ---
const MarkdownResult: React.FC<{ content: string }> = ({ content }) => (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(marked.parse(content) as string, {
          ALLOWED_TAGS: ['p','br','strong','em','a','sup','section','ul','ol','li','h1','h2','h3','h4','h5','h6'],
          ALLOWED_ATTR: ['href','rel','target']
        })
      }}
    />
);

const EditedImageDisplay: React.FC<{ result: EditedImageResult; originalImage: string }> = ({ result, originalImage }) => (
    <div className="space-y-4">
        {result.text && <p>{result.text}</p>}
        <div className="grid grid-cols-2 gap-4">
            <div>
                <h4 className="font-semibold text-xs mb-1">Original</h4>
                <img src={originalImage} alt="Original" className="rounded-lg shadow-md" />
            </div>
            <div>
                <h4 className="font-semibold text-xs mb-1">Edited</h4>
                <img src={`data:image/png;base64,${result.imageBase64}`} alt="Edited" className="rounded-lg shadow-md" />
            </div>
        </div>
    </div>
);

const StoryPostDisplay: React.FC<{ result: SocialPost }> = ({ result }) => (
    <div className="space-y-3">
        <img src={result.imageUrl} alt="Generated for story" className="rounded-lg shadow-md" />
        <div className="p-3 bg-slate-100 rounded-lg">
             <p className="whitespace-pre-wrap font-sans text-xs text-slate-700">{result.caption}</p>
        </div>
    </div>
);

interface Message {
    id: string;
    role: 'user' | 'model';
    content: React.ReactNode;
    textContent?: string; // Store plain text for history
    result?: any;
    toolCalls?: Array<{ name: string; args: any }>;
}

interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

const AgentMode: React.FC = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [useDeepSearch, setUseDeepSearch] = useState<boolean>(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load conversations on mount
    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user]);

    const loadConversations = async () => {
        if (!user) return;
        
        const { data, error } = await supabase
            .from('agent_conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setConversations(data);
        }
    };

    const deleteConversation = async (convId: string) => {
        if (!confirm('Are you sure you want to delete this conversation?')) return;
        
        // Delete messages first
        await supabase
            .from('agent_messages')
            .delete()
            .eq('conversation_id', convId);
        
        // Delete conversation
        const { error } = await supabase
            .from('agent_conversations')
            .delete()
            .eq('id', convId);

        if (!error) {
            // If deleted current conversation, start new one
            if (currentConversationId === convId) {
                startNewConversation();
            }
            // Reload conversation list
            loadConversations();
        }
    };

    const loadConversation = async (convId: string) => {
        const { data, error } = await supabase
            .from('agent_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            const loadedMessages: Message[] = data.map((msg: any) => {
                // For assistant messages with results, render them properly
                if (msg.role === 'assistant' && msg.result) {
                    const result = msg.result;
                    let displayContent: React.ReactNode = msg.content;
                    
                    // Render different result types
                    if (result.imageBase64) {
                        // Edited image result
                        displayContent = <EditedImageDisplay result={result as EditedImageResult} originalImage={result.originalImage || ''} />;
                    } else if (result.imageUrl && result.caption) {
                        // Story post result
                        displayContent = <StoryPostDisplay result={result as SocialPost} />;
                    } else if (result.breed && result.species) {
                        // Pet identification result
                        displayContent = <PetInfoDisplay petData={result} />;
                    } else if (result.answer_md || result.advice) {
                        // Health advice or research result
                        const content = result.answer_md || result.advice;
                        const citations = result.citations;
                        displayContent = (
                            <div className="space-y-3">
                                <MarkdownResult content={content} />
                                {citations && citations.length > 0 && (
                                    <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-xl">
                                        <div className="flex items-start">
                                            <span className="text-purple-600 mr-3 text-lg flex-shrink-0">📚</span>
                                            <div className="flex-1">
                                                <p className="font-semibold mb-2 text-purple-700">参考资料来源：</p>
                                                <div className="grid gap-1">
                                                    {citations.slice(0, 10).map((citation: string, index: number) => (
                                                        <a key={index} href={citation} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-purple-600 hover:text-purple-800 underline break-all line-clamp-1">
                                                            {index + 1}. {citation}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    } else {
                        // Fallback to text content
                        displayContent = <MarkdownResult content={msg.content} />;
                    }
                    
                    return {
                        id: msg.id,
                        role: 'model',
                        content: displayContent,
                        textContent: msg.content,
                        result: msg.result,
                        toolCalls: msg.tool_calls
                    };
                }
                
                // For user messages or assistant messages without results
                return {
                    id: msg.id,
                    role: msg.role === 'user' ? 'user' : 'model',
                    content: msg.content,
                    textContent: msg.content,
                    toolCalls: msg.tool_calls
                };
            });
            setMessages(loadedMessages);
            setCurrentConversationId(convId);
        }
    };

    const startNewConversation = () => {
        setMessages([{
            id: 'init',
            role: 'model',
            content: 'Hello! I\'m your Pet Home AI assistant. I can identify pets, give health advice, edit pet photos, and create stories. How can I help?',
            textContent: 'Hello! I\'m your Pet Home AI assistant. I can identify pets, give health advice, edit pet photos, and create stories. How can I help?'
        }]);
        setCurrentConversationId(null);
        setInput('');
        setFile(null);
        setFilePreview(null);
        setError('');
    };

    const clearConversation = () => {
        setMessages([{
            id: 'init',
            role: 'model',
            content: (
                <div>
                    Hello! I'm your Pet Home AI assistant. I can identify pets, give health advice, edit pet photos, and create stories. How can I help?
                </div>
            ),
            textContent: "Hello! I'm your Pet Home AI assistant. I can identify pets, give health advice, edit pet photos, and create stories. How can I help?"
        }]);
        setInput('');
        clearFile();
        setError('');
    };

    // Welcome message
    useEffect(() => {
        setMessages([{
            id: 'init',
            role: 'model',
            content: (
                <div>
                    Hello! I'm your Pet Home AI assistant. I can identify pets, give health advice, edit pet photos, and create stories. How can I help?
                </div>
            ),
            textContent: "Hello! I'm your Pet Home AI assistant. I can identify pets, give health advice, edit pet photos, and create stories. How can I help?"
        }]);
    }, []);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => setFilePreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
        }
    };

    const clearFile = () => {
        setFile(null);
        setFilePreview(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const fileToBase64 = (f: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            try {
                const dataUrl = reader.result as string;
                resolve((dataUrl.split(',')[1]) || '');
            } catch (e) { reject(e); }
        };
        reader.onerror = reject;
        reader.readAsDataURL(f);
    });

    const sendMessage = async () => {
        if (!input.trim() && !file) return;

        setLoading(true);
        setError('');

        // Save current values before clearing
        const currentInput = input;
        const currentFile = file;
        const currentFilePreview = filePreview;

        // Render user message
        const userMessageContent = (
            <div>
                {filePreview && <img src={filePreview} alt="attachment" className="max-w-xs rounded-lg mb-2" />}
                <p>{currentInput}</p>
            </div>
        );
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            content: userMessageContent,
            textContent: currentInput
        }]);

        setInput('');
        clearFile();

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('请先登录');
            }

            const SUPABASE_URL = 'https://betukaetgtzkfhxhwqma.supabase.co';
            
            // Build conversation history (exclude welcome message and current input)
            const conversationHistory = messages
                .filter(m => m.id !== 'init' && m.textContent)
                .map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.textContent || ''
                }));

            const payload: any = {
                message: currentInput,
                deepSearch: useDeepSearch,
                conversationHistory: conversationHistory,
                conversationId: currentConversationId
            };
            if (currentFile) {
                payload.imageBase64 = await fileToBase64(currentFile);
                payload.mimeType = currentFile.type;
            }

            const toolCallId = `tool-${Date.now()}`;
            setMessages(prev => [...prev, { id: toolCallId, role: 'model', content: <Spinner text="Thinking... (awaiting tool)" /> }]);

            const resp = await fetch(`${SUPABASE_URL}/functions/v1/agent-chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(payload),
            });
            const data = await resp.json().catch(() => ({}));
            const chosenTool: string | undefined = data?.toolCalls?.[0]?.name;
            if (chosenTool) {
                setMessages(prev => prev.map(m => m.id === toolCallId ? { ...m, content: <Spinner text={`Tool: ${chosenTool} — Working...`} /> } : m));
            } else {
                // 若后端暂未返回 toolCalls，则从文本启发
                const fallbackTool = /health|advice|care|symptom/i.test(currentInput) ? 'get_pet_health_advice' : 'web_research';
                setMessages(prev => prev.map(m => m.id === toolCallId ? { ...m, content: <Spinner text={`Tool: ${fallbackTool} — Working...`} /> } : m));
            }

            if (!resp.ok) {
                throw new Error(data?.error || `Agent error: ${resp.status}`);
            }

            // Prefer rendering structured result; only show agent text when no result present
            const result = data?.result;
            let resultDisplay: React.ReactNode | null = null;
            if (result) {
                if (result.imageBase64) {
                    resultDisplay = <EditedImageDisplay result={result as EditedImageResult} originalImage={currentFilePreview!} />;
                } else if (result.imageUrl && result.caption) {
                    resultDisplay = <StoryPostDisplay result={result as SocialPost} />;
                } else if (result.breed && result.species) {
                    resultDisplay = <PetInfoDisplay petData={result} />;
                } else if (result.answer_md) {
                    // Deep-search health answer returns markdown + citations
                    const content = result.citations && result.citations.length > 0
                        ? `${result.answer_md}\n\n${result.citations.map((url: string, idx: number) => `[^${idx + 1}]: ${url}`).join('\n')}`
                        : result.answer_md;
                    resultDisplay = (
                      <div className="space-y-3">
                        <MarkdownResult content={content} />
                        {result.citations && result.citations.length > 0 && (
                          <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-xl">
                            <div className="flex items-start">
                              <span className="text-purple-600 mr-3 text-lg flex-shrink-0">📚</span>
                              <div className="flex-1">
                                <p className="font-semibold mb-2 text-purple-700">参考资料来源：</p>
                                <div className="grid gap-1">
                                  {result.citations.slice(0, 10).map((citation: string, index: number) => (
                                    <a key={index} href={citation} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-purple-600 hover:text-purple-800 underline break-all line-clamp-1">
                                      {index + 1}. {citation}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                } else if (result.advice) {
                    const adviceContent = result.citations && result.citations.length > 0
                        ? `${result.advice}\n\n${result.citations.map((url: string, idx: number) => `[^${idx + 1}]: ${url}`).join('\n')}`
                        : result.advice;
                    resultDisplay = (
                      <div className="space-y-3">
                        <MarkdownResult content={adviceContent} />
                        {result.citations && result.citations.length > 0 && (
                          <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-xl">
                            <div className="flex items-start">
                              <span className="text-purple-600 mr-3 text-lg flex-shrink-0">📚</span>
                              <div className="flex-1">
                                <p className="font-semibold mb-2 text-purple-700">参考资料来源：</p>
                                <div className="grid gap-1">
                                  {result.citations.slice(0, 10).map((citation: string, index: number) => (
                                    <a key={index} href={citation} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-purple-600 hover:text-purple-800 underline break-all line-clamp-1">
                                      {index + 1}. {citation}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                }
            }

            // Get response text for history
            const responseText = data?.response || data?.messages?.[0]?.content || '';
            
            // Update conversation ID if returned
            if (data?.conversationId && !currentConversationId) {
                setCurrentConversationId(data.conversationId);
                // Refresh conversation list
                loadConversations();
            }

            if (resultDisplay) {
                setMessages(prev => [...prev, {
                    id: `res-${Date.now()}`,
                    role: 'model',
                    content: resultDisplay,
                    textContent: responseText,
                    result: result,
                    toolCalls: data?.toolCalls
                }]);
            } else if (responseText) {
                setMessages(prev => [...prev, {
                    id: `msg-${Date.now()}`,
                    role: 'model',
                    content: <MarkdownResult content={responseText} />,
                    textContent: responseText
                }]);
            }
            // Remove the thinking bubble after rendering the final result
            setMessages(prev => prev.filter(m => m.id !== toolCallId));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            console.error('AgentMode error:', err);
            setError(`Error: ${errorMessage}`);
            setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'model', 
                content: <div className="text-red-500 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="font-semibold">❌ Sorry, I encountered an error:</p>
                    <p className="text-sm mt-1">{errorMessage}</p>
                    <p className="text-xs mt-2 text-red-400">Please try again or check your connection.</p>
                </div>
            }]);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex gap-4">
            {/* Conversations Sidebar */}
            <div className="w-64 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border-2 border-pink-100">
                <div className="mb-4">
                    <button
                        onClick={startNewConversation}
                        className="w-full bg-gradient-to-br from-purple-400 to-pink-500 text-white font-bold py-2 px-4 rounded-xl hover:from-purple-500 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-md flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">➕</span>
                        <span>New Chat</span>
                    </button>
                </div>
                
                <h3 className="text-sm font-semibold text-purple-600 mb-3 flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    Chat History
                </h3>
                
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {conversations.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No chat history</p>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={`group relative p-3 rounded-lg transition-all duration-200 ${
                                    currentConversationId === conv.id 
                                        ? 'bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-300'
                                        : 'bg-white hover:bg-pink-50 border border-gray-200'
                                }`}
                            >
                                <button
                                    onClick={() => loadConversation(conv.id)}
                                    className="w-full text-left"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm">💬</span>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className="text-sm font-medium text-gray-700 truncate">
                                                {conv.title || 'Untitled Conversation'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(conv.updated_at).toLocaleDateString('en-US')}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteConversation(conv.id);
                                    }}
                                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded-lg"
                                    title="Delete conversation"
                                >
                                    <span className="text-red-500 text-sm">🗑️</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 min-h-[70vh] bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 rounded-3xl p-6 shadow-2xl border-2 border-pink-200/30" style={{ fontFamily: "'Averia Serif Libre', serif" }}>
                <div className="text-center mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex-1"></div>
                        <div className="flex items-center justify-center">
                            <div className="relative">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                                    <span className="text-2xl">🤖</span>
                                </div>
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-4 border-white flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex justify-end">
                            {messages.length > 1 && (
                                <button
                                    onClick={startNewConversation}
                                    className="bg-gradient-to-br from-red-400 to-pink-500 text-white font-bold py-2 px-4 rounded-2xl hover:from-red-500 hover:to-pink-600 transition-all duration-300 transform hover:scale-105 shadow-lg border-2 border-white/30 flex items-center gap-2"
                                >
                                    🗑️ <span className="hidden sm:inline">New Chat</span>
                                </button>
                            )}
                        </div>
                    </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    🐾 AI Pet Assistant 🐾
                </h2>
                <p className="text-purple-600 max-w-md mx-auto">
                    💕 Chat with our friendly AI to get help with all your pet-related needs! 💕
                </p>
                <div className="flex justify-center mt-3 space-x-1">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
            </div>

            <div className="flex-grow bg-white/60 backdrop-blur-sm rounded-2xl p-4 overflow-y-auto space-y-4 max-h-96 border-2 border-pink-100 shadow-inner">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div className="flex items-end space-x-2 max-w-md">
                            {msg.role === 'model' && (
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mb-1">
                                    <span className="text-sm">🤖</span>
                                </div>
                            )}
                            <div className={`p-4 rounded-2xl text-sm shadow-lg ${
                                msg.role === 'user' 
                                    ? 'bg-gradient-to-br from-pink-400 to-purple-500 text-white rounded-br-sm' 
                                    : 'bg-white border-2 border-pink-100 text-gray-700 rounded-bl-sm'
                            }`}>
                               <div className="break-words">{msg.content}</div>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mb-1">
                                    <span className="text-sm">👤</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {/* Unified with single in-stream thinking bubble; no extra loader here */}
                <div ref={messagesEndRef} />
            </div>

             {error && (
                 <div className="bg-red-50 border-2 border-red-200 text-red-700 p-4 rounded-2xl text-sm shadow-lg">
                     <div className="flex items-center">
                         <span className="text-lg mr-3">😿</span>
                         <span>{error}</span>
                     </div>
                 </div>
             )}

            <div className="border-t-2 border-pink-200/50 pt-4 mt-4">
                {filePreview && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl relative w-fit border-2 border-pink-200">
                        <img src={filePreview} alt="Preview" className="h-20 w-20 object-cover rounded-xl shadow-md"/>
                        <button 
                            onClick={clearFile} 
                            className="absolute -top-2 -right-2 bg-red-400 hover:bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold shadow-lg transition-colors"
                        >
                            ×
                        </button>
                    </div>
                )}
                <div className="flex space-x-3">
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" id="file-upload" />
                     <label htmlFor="file-upload" className="flex-shrink-0 bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold py-3 px-4 rounded-2xl hover:from-yellow-500 hover:to-orange-600 cursor-pointer transition-all duration-300 transform hover:scale-105 shadow-lg border-2 border-white/30">
                        📎 Photo
                    </label>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                        placeholder="💬 Ask me anything about your pet..."
                        className="flex-grow px-4 py-3 bg-white/80 border-2 border-pink-200 rounded-2xl shadow-lg placeholder-purple-400 focus:outline-none focus:ring-4 focus:ring-pink-300/50 focus:border-purple-400 text-sm backdrop-blur-sm"
                        disabled={loading}
                        style={{ fontFamily: "'Averia Serif Libre', serif" }}
                    />
                    {/* 按产品意图：Agent 默认走深度搜索，不提供显式按钮 */}
                    <button
                        onClick={sendMessage}
                        disabled={loading || (!input.trim() && !file)}
                        className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-2xl hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg border-2 border-white/30"
                        style={{ fontFamily: "'Averia Serif Libre', serif" }}
                    >
                        {loading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending...
                            </span>
                        ) : (
                            '💕 Send'
                        )}
                    </button>
                </div>
                {messages.length === 1 && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {[
                            "🐶 Identify my dog's breed",
                            "🐱 Health tips for cats", 
                            "🎨 Edit my pet photo",
                            "📝 Create a cute story"
                        ].map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => setInput(suggestion.split(' ').slice(1).join(' '))}
                                className="px-3 py-2 bg-white/60 border border-pink-200 rounded-full text-xs text-purple-600 hover:bg-pink-100 transition-colors"
                                style={{ fontFamily: "'Averia Serif Libre', serif" }}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default AgentMode;