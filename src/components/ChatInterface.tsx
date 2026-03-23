import { useState, useRef, useEffect } from "react";
import { Send, Zap, Bot, Paperclip, X, Image, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "./ChatMessage";
import { SubjectSelector, Subject } from "./SubjectSelector";
import { SessionSidebar } from "./SessionSidebar";
import { ThemeToggle } from "./ThemeToggle";
import UserMenu from "./UserMenu";
import { SettingsPanel, ApiConfiguration } from "./SettingsPanel";
import { useApiConfig } from "@/hooks/useApiConfig";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import tentenIcon from "@/assets/tenten-icon.png";

interface ImageAttachment {
  id: string;
  url: string;
  name: string;
  size: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  reasoning?: string;
  debugData?: any;
  waitingTime?: number;
  attachments?: ImageAttachment[];
  dbId?: string; // UUID from database
  sessionInfo?: { id: number };
  messageInfo?: { id: number };
  statusInfo?: { state: string };
  usedTenergy?: number;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>({ value: "physics", label: "Physics", description: "" });
  const [pendingAttachments, setPendingAttachments] = useState<ImageAttachment[]>([]);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [waitingTime, setWaitingTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messageIdCounter, setMessageIdCounter] = useState(3001);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const { config, updateConfig, isGitMode, getApiUrl, getAuthHeader } = useApiConfig();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadImage, isUploading } = useImageUpload();
  const { user } = useAuth();

  // Fetch user profile when component mounts
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      createOrGetCurrentSession();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const createOrGetCurrentSession = async () => {
    if (!user || currentSessionId) return;

    try {
      // Create new session
      const sessionName = `Session ${new Date().toLocaleString()}`;
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: user.id,
          session_name: sessionName
        }])
        .select()
        .single();

      if (error) throw error;
      setCurrentSessionId(data.id);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleSessionSelect = async (sessionId: number) => {
    setCurrentSessionId(sessionId);
    setIsSidebarOpen(false);
    // Load messages for this session
    await loadSessionMessages(sessionId);
  };

  const handleNewChat = async () => {
    if (!user) return;

    try {
      // Create new session
      const sessionName = `Session ${new Date().toLocaleString()}`;
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{
          user_id: user.id,
          session_name: sessionName
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCurrentSessionId(data.id);
      setMessages([]); // Clear current messages
      toast({
        title: "New Chat Started",
        description: "Created a new chat session.",
      });
    } catch (error) {
      console.error('Error creating new session:', error);
      toast({
        title: "Error",
        description: "Failed to create new chat session.",
        variant: "destructive",
      });
    }
  };

  const loadSessionMessages = async (sessionId: number) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = [];
      
      for (const msg of data || []) {
        // Add user message
        if (msg.question) {
          loadedMessages.push({
            id: `user-${msg.id}`,
            role: 'user',
            content: msg.question,
            timestamp: new Date(msg.created_at),
          });
        }

        // Add AI message if it exists
        if (msg.final_answer) {
          loadedMessages.push({
            id: `ai-${msg.id}`,
            role: 'assistant',
            content: msg.final_answer,
            timestamp: new Date(msg.updated_at),
            debugData: msg.webhook_response,
            dbId: msg.id, // Store the database UUID
          });
        }
      }

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  };

  const storeMessageInDatabase = async (
    question: string, 
    webhookRequest: any, 
    webhookResponse: any, 
    finalAnswer: string, 
    messageId: string
  ) => {
    if (!user || !currentSessionId) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          session_id: currentSessionId,
          user_id: user.id,
          message_id: messageId,
          question,
          webhook_request: webhookRequest,
          webhook_response: webhookResponse,
          final_answer: finalAnswer,
        }])
        .select()
        .single();

      if (error) throw error;
      return data.id; // Return the UUID
    } catch (error) {
      console.error('Error storing message:', error);
      return null;
    }
  };
  const scrollToBottom = () => {
    if (isAutoScrollEnabled && chatContainerRef.current) {
      // Scroll to bottom of chat container, not past the footer
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAutoScrollEnabled]);

  // Handle scroll behavior - disable auto-scroll when user scrolls up
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAutoScrollEnabled(isAtBottom);
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && pendingAttachments.length === 0) return;

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue.",
        variant: "destructive",
      });
      return;
    }

    // Ensure we have a current session
    if (!currentSessionId) {
      await createOrGetCurrentSession();
      if (!currentSessionId) return;
    }

    const currentMessageId = messageIdCounter.toString();
    setMessageIdCounter(prev => prev + 1);

    const userMessage: Message = {
      id: `user-${currentMessageId}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      attachments: pendingAttachments.length > 0 ? [...pendingAttachments] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setPendingAttachments([]);
    setIsLoading(true);

    // Create streaming AI message
    const aiMessageId = `ai-${currentMessageId}`;
    const aiMessage: Message = {
      id: aiMessageId,
      role: "assistant", 
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, aiMessage]);

    // Start waiting timer
    setWaitingTime(0);
    waitingTimerRef.current = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);

    try {
      // Prepare payload based on API mode
      let payload: any;
      let apiUrl = getApiUrl();
      let headers = getAuthHeader();

      if (isGitMode) {
        // FastAPI payload format
        payload = {
          body: {
            text: userMessage.content,
            attachments: pendingAttachments.map(attachment => ({
              url: attachment.url,
              type: "image"
            }))
          },
          session_id: config.sessionId,
          thread_id: config.threadId
        };
      } else {
        // N8N webhook payload format
        payload = {
          auth_user_id: user.id,
          user_name: userProfile?.full_name || user.email?.split('@')[0] || "User",
          session_id: currentSessionId?.toString(),
          live_class_id: "NoVKlRff9E",
          date: Date.now(),
          question: userMessage.content,
          messageId: currentMessageId,
          live_class_name: `${selectedSubject?.label || "Physics"} Live Class`,
          course_name: selectedSubject?.label || "Physics",
          program_name: `HSC 27 অনলাইন ব্যাচ - ${selectedSubject?.label || "Physics"}`,
          ...(pendingAttachments.length > 0 && {
            attachments: pendingAttachments.map(attachment => ({
              file_url: attachment.url
            }))
          })
        };
      }

      // Create AbortController with 10 minute timeout for image processing
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10 * 60 * 1000); // 10 minutes

      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
        // Add keep-alive to prevent connection timeouts
        keepalive: true,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is streaming - n8n might not set specific content-type headers
      const contentType = response.headers.get('content-type') || '';
      const transferEncoding = response.headers.get('transfer-encoding') || '';
      const isStreaming = contentType.includes('text/stream') || 
                         contentType.includes('application/stream') ||
                         transferEncoding.includes('chunked') ||
                         response.body; // Assume streaming if we have a readable stream
      
      let data;
      let aiResponse = "";
      let aiReasoning = "";
      let fullResponse = "";
      let sessionInfo: { id: number } | undefined;
      let messageInfo: { id: number } | undefined;
      let statusInfo: { state: string } | undefined;
      let usedTenergy: number | undefined;

      if (response.body) {
        console.log("Processing streaming response...");
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            // Decode chunk and add to buffer
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            fullResponse += chunk;
            
            // Try to parse complete JSON objects from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.trim()) {
                try {
                  let parsedChunk;
                  
                  // Check if it's server-sent events format
                  if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === '[DONE]') continue;
                    parsedChunk = JSON.parse(jsonStr);
                  } else {
                    parsedChunk = JSON.parse(line);
                  }
                  
                  // Handle FastAPI event-based streaming format
                  if (isGitMode && parsedChunk.event) {
                    switch (parsedChunk.event) {
                      case 'session':
                        sessionInfo = parsedChunk.data;
                        setMessages(prev => prev.map(msg => 
                          msg.id === aiMessageId 
                            ? { ...msg, sessionInfo, isStreaming: true }
                            : msg
                        ));
                        break;
                      case 'message_id':
                        messageInfo = parsedChunk.data;
                        setMessages(prev => prev.map(msg => 
                          msg.id === aiMessageId 
                            ? { ...msg, messageInfo, isStreaming: true }
                            : msg
                        ));
                        break;
                      case 'status':
                        statusInfo = parsedChunk.data;
                        setMessages(prev => prev.map(msg => 
                          msg.id === aiMessageId 
                            ? { ...msg, statusInfo, isStreaming: true }
                            : msg
                        ));
                        break;
                      case 'message':
                        if (parsedChunk.data?.delta) {
                          aiResponse += parsedChunk.data.delta;
                          setMessages(prev => prev.map(msg => 
                            msg.id === aiMessageId 
                              ? { ...msg, content: aiResponse, isStreaming: true }
                              : msg
                          ));
                        }
                        break;
                      case 'token':
                        if (parsedChunk.data?.used_tenergy !== undefined) {
                          usedTenergy = parsedChunk.data.used_tenergy;
                          setMessages(prev => prev.map(msg => 
                            msg.id === aiMessageId 
                              ? { ...msg, usedTenergy, isStreaming: true }
                              : msg
                          ));
                        }
                        break;
                      case 'end':
                        // Stream ended
                        break;
                      default:
                        console.log('Unknown event type:', parsedChunk.event);
                    }
                  } else {
                    // Handle N8N format (existing logic)
                    let chunkContent = "";
                    
                    // Handle n8n output format first (most specific)
                    if (parsedChunk.output) {
                      chunkContent = parsedChunk.output;
                    } else if (Array.isArray(parsedChunk) && parsedChunk[0]?.output) {
                      chunkContent = parsedChunk[0].output;
                    }
                    // Handle other streaming formats
                    else if (parsedChunk.content) {
                      chunkContent = parsedChunk.content;
                    } else if (parsedChunk.delta?.content) {
                      chunkContent = parsedChunk.delta.content;
                    } else if (parsedChunk.choices?.[0]?.delta?.content) {
                      chunkContent = parsedChunk.choices[0].delta.content;
                    } else if (parsedChunk.text) {
                      chunkContent = parsedChunk.text;
                    }
                    
                    if (chunkContent) {
                      // For n8n, the chunk might contain the complete response so far, not just a delta
                      if (parsedChunk.output || (Array.isArray(parsedChunk) && parsedChunk[0]?.output)) {
                        // For n8n output format, replace the full content (not append)
                        aiResponse = chunkContent;
                      } else {
                        // For other formats, append the chunk
                        aiResponse += chunkContent;
                      }
                      
                      // Update UI in real-time
                      setMessages(prev => prev.map(msg => 
                        msg.id === aiMessageId 
                          ? { ...msg, content: aiResponse, isStreaming: true }
                          : msg
                      ));
                    }
                    
                    // Handle reasoning updates
                    if (parsedChunk.reasoning) {
                      aiReasoning = parsedChunk.reasoning;
                    }
                  }
                  
                } catch (parseError) {
                  // Skip malformed JSON chunks
                  console.warn("Failed to parse streaming chunk:", line, parseError);
                }
              }
            }
          }
          
          // Process any remaining buffer
          if (buffer.trim()) {
            try {
              const parsedChunk = JSON.parse(buffer);
              if (parsedChunk.content) {
                aiResponse += parsedChunk.content;
              }
            } catch (e) {
              console.warn("Failed to parse final buffer:", buffer);
            }
          }
          
        } catch (streamError) {
          console.error("Error reading stream:", streamError);
          throw streamError;
        }
        
        data = { 
          ai_response: aiResponse, 
          ai_reasoning: aiReasoning, 
          fullResponse,
          sessionInfo,
          messageInfo,
          statusInfo,
          usedTenergy
        };
        
      } else {
        // Handle non-streaming response (existing logic)
        console.log("Processing non-streaming response...");
        
        try {
          const responseText = await response.text();
          console.log("Raw webhook response:", responseText);
          
          if (responseText.trim()) {
            data = JSON.parse(responseText);
            console.log("Parsed webhook data:", data);
            
            // Handle n8n workflow response format
            const responseData = Array.isArray(data) ? data[0] : data;
            
            // Handle the new output format: [{"output": "response text"}]
            if (responseData?.output) {
              aiResponse = responseData.output;
            }
            // Extract AI response from content_blocks structure (fallback)
            else if (responseData?.ai_response?.content_blocks?.[0]?.data?.content) {
              aiResponse = responseData.ai_response.content_blocks[0].data.content;
              aiReasoning = responseData.ai_reasoning || "";
            }
            // Handle content_blocks at root level (fallback)
            else if (responseData?.content_blocks?.[0]?.data?.content) {
              aiResponse = responseData.content_blocks[0].data.content;
              aiReasoning = responseData.ai_reasoning || "";
            }
            // Other fallback formats
            else if (responseData?.ai_response?.content) {
              aiResponse = responseData.ai_response.content;
              aiReasoning = responseData.ai_reasoning || "";
            }
            else if (data.response) {
              aiResponse = data.response;
            } 
            else if (data.message) {
              aiResponse = data.message;
            } 
            else if (data.ai_response) {
              aiResponse = typeof data.ai_response === 'string' ? data.ai_response : JSON.stringify(data.ai_response);
              aiReasoning = data.ai_reasoning || "";
            }
            else {
              aiResponse = "I received your message and processed it through the n8n workflow.";
            }
          } else {
            aiResponse = "I received your message and processed it through the n8n workflow.";
          }
        } catch (parseError) {
          console.warn("Failed to parse webhook response as JSON:", parseError);
          aiResponse = "I received your message and processed it through the n8n workflow.";
        }

        // Simulate streaming effect for non-streaming responses
        const words = aiResponse.split(" ");
        let currentResponse = "";
        
        for (let i = 0; i < words.length; i++) {
          currentResponse += (i > 0 ? " " : "") + words[i];
          
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, content: currentResponse, isStreaming: i < words.length - 1, reasoning: aiReasoning }
              : msg
          ));
          
          // Add small delay for streaming effect
          if (i < words.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }

      // Clean the response - remove leading numbers, zeros, and unwanted characters
      if (aiResponse) {
        // More aggressive cleaning - remove any leading digits, zeros, and whitespace
        aiResponse = aiResponse.replace(/^[0-9\s]+/, '').trim();
        // Remove leading punctuation except meaningful characters for Bengali/other languages
        aiResponse = aiResponse.replace(/^[^\w\u0980-\u09FF\u4e00-\u9fff\u0600-\u06ff]+/, '').trim();
      }
      
      if (aiReasoning) {
        aiReasoning = aiReasoning.replace(/^[0-9\s]+/, '').trim();
        aiReasoning = aiReasoning.replace(/^[^\w\u0980-\u09FF\u4e00-\u9fff\u0600-\u06ff]+/, '').trim();
      }

      console.log("Final AI response:", aiResponse);

      // Final update to remove streaming indicator and store debug data
      const finalWaitingTime = waitingTime;
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { 
              ...msg, 
              content: aiResponse, 
              isStreaming: false, 
              reasoning: aiReasoning, 
              debugData: data, 
              waitingTime: finalWaitingTime,
              sessionInfo,
              messageInfo,
              statusInfo,
              usedTenergy: data?.usedTenergy
            }
          : msg
      ));

      // Store the complete conversation in database
      const dbId = await storeMessageInDatabase(
        userMessage.content,
        payload,
        data,
        aiResponse,
        currentMessageId
      );

      // Update AI message with database ID for feedback functionality
      if (dbId) {
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, dbId }
            : msg
        ));
      }

    } catch (error) {
      console.error("Error calling n8n webhook:", error);
      
      let errorMessage = "Sorry, I encountered an error while processing your request.";
      let toastDescription = "An error occurred while processing your request.";
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "The request took longer than expected to process. This can happen with image uploads. Please try again.";
          toastDescription = "Request timeout - this can happen with image processing. Please try again.";
        } else if (error.message.includes('Failed to fetch')) {
          // Check if it's likely a mixed content issue
          const apiUrl = getApiUrl();
          if (apiUrl.startsWith('http://') && window.location.protocol === 'https:') {
            errorMessage = "Mixed content error: Cannot access HTTP endpoints from HTTPS pages. Please use HTTPS endpoints or access the app via HTTP.";
            toastDescription = "Mixed content blocked - use HTTPS endpoints when accessing from HTTPS pages.";
          } else {
            errorMessage = "Unable to connect to the AI service. Please check your internet connection and try again.";
            toastDescription = "Network connection error. Please check your connection and try again.";
          }
        }
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { 
              ...msg, 
              content: errorMessage,
              isStreaming: false 
            }
          : msg
      ));

      toast({
        title: "Error",
        description: toastDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Clear waiting timer
      if (waitingTimerRef.current) {
        clearInterval(waitingTimerRef.current);
        waitingTimerRef.current = null;
      }
      setWaitingTime(0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadedImage = await uploadImage(file);
      if (uploadedImage) {
        setPendingAttachments(prev => [...prev, uploadedImage]);
      }
    }
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-screen bg-gradient-chat">
      {/* Sidebar - only render the full sidebar when open */}
      {isSidebarOpen && (
        <SessionSidebar 
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
        />
      )}

      {/* Main Chat Interface */}
      <div className={cn("flex flex-col flex-1 transition-all duration-300", isSidebarOpen ? "ml-80" : "ml-0")}>
        {/* Header */}
<<<<<<< Updated upstream
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <SessionSidebar 
                  isOpen={isSidebarOpen}
                  onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                  currentSessionId={currentSessionId}
                  onSessionSelect={handleSessionSelect}
                />
              )}
              <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-elegant">
=======
        <header className="sticky top-0 z-30 pt-safe px-3 sm:px-5">
          <div className={cn(
            "mt-3",
            isMobile
              ? "rounded-[1.2rem] border border-white/8 bg-[hsl(var(--card)/0.58)] px-2.5 py-2 backdrop-blur-xl"
              : "nebula-glass rounded-[1.75rem] px-4 py-3 sm:px-5"
          )}>
            <div className={cn(
              isMobile ? "flex items-center gap-2 min-w-0" : "flex items-center justify-between"
            )}>
              <SessionSidebar 
                ref={sessionSidebarRef}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                currentSessionId={currentSessionId}
                onSessionSelect={handleSessionSelect}
              />

              <div className={cn(
                "overflow-hidden ring-1 ring-white/10 shrink-0",
                isMobile ? "h-9 w-9 rounded-[0.95rem]" : "w-11 h-11 rounded-[1.25rem] shadow-glow"
              )}>
>>>>>>> Stashed changes
                <img 
                  src={tentenIcon} 
                  alt="TenTen AI" 
                  className="w-full h-full object-cover"
                />
              </div>
<<<<<<< Updated upstream
              <div>
                <h1 className="text-lg font-semibold gradient-text">TenTen AI - Dev Mode</h1>
                <p className="text-sm text-muted-foreground">HIGHLY CONFIDENTIAL</p>
=======

              <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1 overflow-hidden">
                <p className={cn("eyebrow-label truncate", isMobile && "text-[0.52rem] tracking-[0.18em]")}>HIGHLY CONFIDENTIAL</p>
                <h1 className={cn(
                  "font-semibold gradient-text flex items-center gap-2 min-w-0",
                  isMobile ? "text-[0.95rem] leading-none" : "text-lg sm:text-xl"
                )}>
                  <span className="truncate">TenTenAI</span>
                  {(config.mode === "tenten-git" || config.mode === "tenten-video" || config.mode === "tenten-exam") && (
                    <Badge variant="secondary" className={cn(
                      "rounded-full border-0 bg-white/8 uppercase tracking-[0.18em] text-foreground/80 shrink-0",
                      isMobile ? "px-1.5 py-0.5 text-[0.48rem]" : "px-2.5 py-1 text-[0.65rem]"
                    )}>
                      {config.gitEndpoint.charAt(0).toUpperCase() + config.gitEndpoint.slice(1)}
                    </Badge>
                  )}
                </h1>
                <p className={cn("text-muted-foreground truncate", isMobile ? "text-[0.72rem]" : "text-sm")}>Dev Mode</p>
              </div>

              <div className={cn("flex items-center shrink-0", isMobile ? "gap-1" : "gap-2 flex-wrap")}>
                {/* Mobile Subject Selector (Sheet) */}
                <Sheet open={isSubjectSheetOpen} onOpenChange={setIsSubjectSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-0 bg-white/5 sm:hidden"
                      aria-label="Choose subject"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="pb-safe h-[85dvh] max-h-[90dvh] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Select Subject</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 px-2">
                      <SubjectSelector 
                        selectedSubject={selectedSubject} 
                        onSubjectChange={(s) => { setSelectedSubject(s); setIsSubjectSheetOpen(false); }}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* New Chat: icon on mobile, text on desktop */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNewChat}
                  className="nebula-ghost-button flex items-center gap-2 h-8 w-8 rounded-full border-0 sm:hidden"
                  aria-label="New Chat"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewChat}
                  className="nebula-primary-button items-center gap-2 hidden rounded-full border-0 px-4 text-primary-foreground sm:flex"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline">New Chat</span>
                </Button>

                {/* Subject selector visible on sm+ */}
                <div className="hidden sm:block">
                  <SubjectSelector 
                    selectedSubject={selectedSubject} 
                    onSubjectChange={setSelectedSubject} 
                  />
                </div>

                {/* Settings: icon on mobile, text on desktop */}
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setIsSettingsOpen(true)}
                  className="nebula-primary-button h-8 w-8 rounded-full border-0 text-primary-foreground sm:hidden"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {isMobile && (
                  <div className="scale-[0.82] origin-center">
                    <ThemeToggle />
                  </div>
                )}
                {isMobile && (
                  <div className="scale-[0.82] origin-center">
                    <UserMenu />
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSettingsOpen(true)}
                  className="nebula-ghost-button items-center gap-2 hidden rounded-full border-0 px-4 sm:flex"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline">Settings</span>
                </Button>
                {!isMobile && (
                  <>
                    <div className="scale-[0.92] sm:scale-100">
                      <ThemeToggle />
                    </div>
                    <div className="scale-[0.92] sm:scale-100">
                      <UserMenu />
                    </div>
                  </>
                )}
>>>>>>> Stashed changes
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
              <SubjectSelector 
                selectedSubject={selectedSubject} 
                onSubjectChange={setSelectedSubject} 
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>

        </header>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto chat-scroll pb-4">
        {messages.length === 0 ? (
<<<<<<< Updated upstream
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden shadow-glow mb-4">
              <img 
                src={tentenIcon} 
                alt="TenTen AI" 
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-xl font-semibold mb-2 gradient-text">
              Hello! I'm TenTen
            </h2>
            <p className="text-muted-foreground max-w-md">
              I'm here to help you solve your doubts and understand complex concepts. 
=======
          <div className={cn(
            "flex flex-col items-center text-center",
            isMobile ? "min-h-0 px-4 py-4" : "justify-center h-full px-6 py-12"
          )}>
            <div className={cn(
              "floating-brand-icon flex items-center justify-center",
              isMobile ? "mb-3 h-16 w-16" : "mb-10 h-28 w-28"
            )}>
              <img 
                src={tentenIcon} 
                alt="TenTen AI" 
                className={cn(
                  "object-contain",
                  isMobile ? "h-12 w-12" : "h-20 w-20 sm:h-24 sm:w-24"
                )}
              />
            </div>
            <p className={cn("eyebrow-label mb-2 text-[0.82rem] tracking-[0.24em] sm:text-[0.92rem]", isMobile && "text-[0.68rem] tracking-[0.2em]")}>TenTen AI - Dev Mode</p>
            <h2 className={cn(
              "max-w-2xl font-semibold tracking-tight mb-4",
              isMobile ? "text-[1.7rem] leading-[0.98]" : "text-4xl sm:text-5xl"
            )}>
              Ready to <span className="gradient-text">Chat?</span>
            </h2>
            <p className={cn(
              "text-muted-foreground max-w-2xl",
              isMobile ? "text-[0.92rem] leading-6" : "text-lg leading-8"
            )}>
              This is a testing web app for TenTen, built to validate prompts, flows, and subject-focused reasoning in Dev Mode before production rollout.
            </p>
            <div className={cn(
              "grid w-full max-w-3xl gap-4",
              isMobile ? "mt-5 grid-cols-1" : "mt-10",
              !isMobile && "sm:grid-cols-2"
            )}>
              <div className={cn("nebula-panel text-left", isMobile ? "rounded-[1.35rem] p-4" : "rounded-[1.75rem] p-5")}>
                <p className="eyebrow-label mb-3">Code Architect</p>
                <p className="text-lg font-semibold">Review complex logic</p>
                <p className="mt-2 text-sm text-muted-foreground">Use TenTen to inspect flows, debug payloads, and reason through implementation details.</p>
              </div>
              <div className={cn("nebula-panel text-left", isMobile ? "rounded-[1.35rem] p-4" : "rounded-[1.75rem] p-5")}>
                <p className="eyebrow-label mb-3">Creative Flow</p>
                <p className="text-lg font-semibold">Draft and refine ideas</p>
                <p className="mt-2 text-sm text-muted-foreground">Shape explanations, brainstorm approaches, and iterate on polished responses.</p>
              </div>
            </div>
            <p className={cn("text-muted-foreground max-w-md", isMobile ? "mt-5 mb-2 text-sm" : "mt-10")}>
>>>>>>> Stashed changes
              Ask me anything about {selectedSubject?.label.toLowerCase() || "any subject"}!
            </p>
            {isLoading && waitingTime > 0 && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg border-l-2 border-primary/30">
                <p className="text-sm text-primary font-medium">
                  🤔 Thinking... {waitingTime}s
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 px-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} sessionId={currentSessionId ?? undefined} />
            ))}
            {isLoading && waitingTime > 0 && (
              <div className="flex gap-3 p-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
                <div className="message-bubble ai max-w-[85%] sm:max-w-[70%]">
                  <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary/30">
                    <p className="text-sm text-primary font-medium">
                      🤔 Thinking... {waitingTime}s
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4 sticky bottom-0">
        {/* Pending Attachments */}
        {pendingAttachments.length > 0 && (
          <div className="mb-3 max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {pendingAttachments.map((attachment) => (
                <div key={attachment.id} className="relative group">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                    <img 
                      src={attachment.url} 
                      alt={attachment.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePendingAttachment(attachment.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAttachClick}
            disabled={isLoading || isUploading}
            className="h-11 w-11 shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything... (Shift+Enter for new line)"
              className={cn(
                "chat-input resize-none min-h-[44px] max-h-32",
                "placeholder:text-muted-foreground/70"
              )}
              disabled={isLoading}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && pendingAttachments.length === 0) || isLoading}
            className="h-11 w-11 p-0 bg-gradient-primary hover:shadow-glow transition-all duration-300 shrink-0"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
<<<<<<< Updated upstream
        <p className="text-xs text-muted-foreground text-center mt-2">
=======
        <p className={cn(
          "text-[0.64rem] text-muted-foreground text-center mt-3 tracking-[0.14em] uppercase sm:text-[0.68rem]",
          isMobile && "mt-2 text-[0.52rem] tracking-[0.1em]"
        )}>
>>>>>>> Stashed changes
          TenTen can make mistakes. Please verify important information.
        </p>
      </div>
      
      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentConfig={config}
        onConfigChange={updateConfig}
      />
    </div>
    </div>
  );
}