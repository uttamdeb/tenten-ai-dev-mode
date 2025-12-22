import { useState, useRef, useEffect } from "react";
import { Send, Zap, Bot, Paperclip, X, Image, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessage } from "./ChatMessage";
import { SubjectSelector, Subject } from "./SubjectSelector";
import { getThreadIdFromSubject, getSubjectFromThreadId } from "@/utils/threadMapping";
import { SessionSidebar, SessionSidebarHandle } from "./SessionSidebar";
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
import { useUserProfile } from "@/hooks/useUserProfile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BookOpen } from "lucide-react";
import { useKeyboardInsets } from "@/hooks/useKeyboardInsets";

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
  threadId?: number;
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
  const [isSubjectSheetOpen, setIsSubjectSheetOpen] = useState(false);
  const [sessionRefreshTrigger, setSessionRefreshTrigger] = useState(0);
  
  const { config, updateConfig, isGitMode, getApiUrl, getAuthHeader } = useApiConfig();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadImage, isUploading } = useImageUpload();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const kbInset = useKeyboardInsets();
  const inputBarRef = useRef<HTMLDivElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [vw, setVw] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = vw < 640;

  // Handler to refresh sessions list in sidebar
  const sessionSidebarRef = useRef<SessionSidebarHandle>(null);
  
  useEffect(() => {
    if (sessionSidebarRef.current?.refresh) {
      sessionSidebarRef.current.refresh();
    }
  }, [sessionRefreshTrigger]);

  // Sync profile from hook into local state for existing usage
  useEffect(() => {
    if (profile) setUserProfile(profile);
  }, [profile]);

  // Track previous values to prevent infinite loops
  const prevThreadIdRef = useRef(config.threadId);
  const prevSubjectRef = useRef(selectedSubject?.value);

  // Bidirectional sync between subject and thread ID (only for Git mode)
  useEffect(() => {
    if (config.mode !== 'tenten-git') return;

    // Subject changed → update thread ID
    if (selectedSubject?.value !== prevSubjectRef.current) {
      const newThreadId = getThreadIdFromSubject(selectedSubject.value, config.gitEndpoint);
      if (newThreadId !== null && config.threadId !== newThreadId) {
        prevThreadIdRef.current = newThreadId;
        updateConfig({ ...config, threadId: newThreadId });
      }
      prevSubjectRef.current = selectedSubject?.value;
    }
    // Thread ID changed → update subject
    else if (config.threadId !== prevThreadIdRef.current) {
      const subjectValue = getSubjectFromThreadId(config.threadId, config.gitEndpoint);
      if (subjectValue && subjectValue !== selectedSubject?.value) {
        const subjects = [
          { value: "mathematics", label: "Math" },
          { value: "physics", label: "Physics" },
          { value: "chemistry", label: "Chemistry" },
          { value: "biology", label: "Biology" },
          { value: "bangla", label: "Bangla" },
          { value: "english", label: "English" },
          { value: "ict", label: "ICT" }
        ];
        const newSubject = subjects.find(s => s.value === subjectValue);
        if (newSubject) {
          prevSubjectRef.current = newSubject.value;
          setSelectedSubject({ ...newSubject, description: "" });
        }
      }
      prevThreadIdRef.current = config.threadId;
    }
  }, [selectedSubject?.value, config.threadId, config.mode, config.gitEndpoint]);

  // Fetch user profile when component mounts
  useEffect(() => {
    if (user) {
      // createOrGetCurrentSession(); // Do not pre-create; wait for API session id
    }
  }, [user]);

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

  const refreshAuthToken = async () => {
    try {
      let loginUrl = '';
      let credentials = {};

      // Determine which endpoint and credentials to use based on mode
      if (config.mode === 'tenten-git' || config.mode === 'tenten-video') {
        // Use endpoint and credentials based on gitEndpoint
        if (config.gitEndpoint === 'prod') {
          // Prod endpoint - use prod credentials
          loginUrl = 'https://api.10minuteschool.com/auth/v1/login';
          credentials = {
            username: "+8801521326202",
            loginType: "phone",
            password: "123456"
          };
        } else {
          // Stage or Local endpoint - use stage credentials
          loginUrl = 'https://local-api.10minuteschool.net/auth/v1/login';
          credentials = {
            username: "admin@10ms.com",
            loginType: "email",
            password: "#11111111"
          };
        }
      } else {
        // N8N mode doesn't need token refresh
        return;
      }

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json, text/plain, */*',
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      const newToken = data?.data?.token?.access_token;

      if (newToken) {
        // Update the authorization token in config - this will persist to localStorage
        const updatedConfig = { ...config, authorizationToken: newToken };
        updateConfig(updatedConfig);
        console.log('Authorization token refreshed successfully');
      } else {
        console.warn('No access token found in response');
      }
    } catch (error) {
      console.error('Error refreshing auth token:', error);
      // Don't show error to user, just log it
    }
  };

  const handleNewChat = async () => {
    if (!user) return;

    // Refresh auth token for git and video modes
    if (config.mode === 'tenten-git' || config.mode === 'tenten-video') {
      await refreshAuthToken();
    }

    // Do not create a DB session yet. We'll create it when API returns the session id.
    setCurrentSessionId(null);
    setMessages([]);
    // Reset API session id (but keep the refreshed auth token)
    const updatedConfig = { ...config, sessionId: null };
    updateConfig(updatedConfig);
    toast({
      title: "New Chat Started",
      description: "Start fresh with TenTen",
    });
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
            debugData: {
              webhookRequest: msg.webhook_request,
              webhookResponse: msg.webhook_response,
            },
            threadId: (msg as any)?.webhook_request?.thread_id ?? undefined,
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
    messageId: string,
    sessionIdToUse: number,
    apiSessionId?: number
  ) => {
    if (!user || !sessionIdToUse) return null;

    // Base payload always valid regardless of schema changes
    const basePayload: any = {
      session_id: sessionIdToUse,
      user_id: user.id,
      message_id: messageId,
      question,
      webhook_request: webhookRequest,
      webhook_response: webhookResponse,
      final_answer: finalAnswer,
    };

    // First try: include api_session_id when provided
    const payloadWithApi = apiSessionId ? { ...basePayload, api_session_id: apiSessionId } : basePayload;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([payloadWithApi])
        .select()
        .single();

      if (error) throw error;
      return data.id; // Return the UUID
    } catch (err: any) {
      // If the insert failed because api_session_id column doesn't exist, retry without it
      const msg = err?.message || "";
      const code = err?.code || "";
      const columnMissing = msg.includes('api_session_id') || code === '42703'; // 42703 = undefined_column
      if (apiSessionId && columnMissing) {
        try {
          const { data, error } = await supabase
            .from('chat_messages')
            .insert([basePayload])
            .select()
            .single();
          if (error) throw error;
          return data.id;
        } catch (fallbackErr) {
          console.error('Error storing message (fallback):', fallbackErr);
          return null;
        }
      }
      console.error('Error storing message:', err);
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

    // Do not pre-create Supabase session; the API will provide session id on first response.
    // if (!currentSessionId) {
    //   await createOrGetCurrentSession();
    //   if (!currentSessionId) return;
    // }

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
      threadId: config.mode === 'tenten-git' ? config.threadId : undefined,
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
        // Special handling for exam explanation mode
        if (config.mode === 'tenten-exam-explanation') {
          // Exam explanation only needs question_id
          payload = {
            question_id: config.questionId
          };
        } else {
          // FastAPI payload format for other git modes
          payload = {
            body: {
              text: userMessage.content,
              attachments: pendingAttachments.map(attachment => ({
                url: attachment.url,
                type: "image"
              }))
            },
            session_id: config.sessionId
          };

          // thread_id is only used for the git workflow (not for video or exam)
          if (config.mode === 'tenten-git') {
            payload.thread_id = config.threadId;
          }

          // Add video mode specific fields when in tenten-video
          if (config.mode === 'tenten-video') {
            if (config.contentType !== null) {
              payload.content_type = config.contentType;
            }
            if (config.contentId !== null) {
              payload.content_id = config.contentId;
            }
            if (config.segmentId !== null) {
              payload.segment_id = config.segmentId;
            }
          }

          // Add exam mode specific fields when in tenten-exam
          if (config.mode === 'tenten-exam') {
            // Set content_type (default to "question" if not provided)
            payload.content_type = config.contentType || "question";
            
            // Required fields for exam mode
            if (config.contentId !== null) {
              payload.content_id = config.contentId;
            }
            
            // Add segment_id if provided
            if (config.segmentId !== null) {
              payload.segment_id = config.segmentId;
            }
            
            // Add extra field with exam-specific data
            payload.extra = {};
            if (config.examId !== null) {
              payload.extra.exam_id = config.examId;
            }
            if (config.examSessionId !== null) {
              payload.extra.exam_session_id = config.examSessionId;
            }
          }
        }
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
      let storedApiSessionForCurrent = false;
      let currentStreamSessionId: number | null = null; // Track session ID across multiple session events

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
                      case 'session': {
                        // Merge session data instead of replacing to preserve id when title comes later
                        sessionInfo = sessionInfo ? { ...sessionInfo, ...parsedChunk.data } : parsedChunk.data;
                        const apiSessId = parsedChunk.data?.id;
                        const sessionTitle = parsedChunk.data?.title;
                        
                        // Track session ID from first session event
                        if (apiSessId) {
                          currentStreamSessionId = apiSessId;
                          
                          // Update config for subsequent requests only if not manually set
                          if (!config.sessionId) {
                            updateConfig({ ...config, sessionId: String(apiSessId) });
                          }
                          
                          setCurrentSessionId(apiSessId);
                          
                          // Create initial session row with timestamp-based name ONLY if it doesn't exist
                          if (user) {
                            try {
                              // First check if session already exists
                              const { data: existingSession } = await supabase
                                .from('chat_sessions')
                                .select('id')
                                .eq('id', apiSessId)
                                .single();
                              
                              // Only insert if session doesn't exist
                              if (!existingSession) {
                                await supabase
                                  .from('chat_sessions')
                                  .insert([
                                    {
                                      id: apiSessId,
                                      user_id: user.id,
                                      session_name: `Session ${new Date().toLocaleString()}`,
                                    },
                                  ]);
                              }
                            } catch (e) {
                              console.warn('Failed to create chat_sessions with API id', e);
                            }
                          }
                        }
                        
                        // Handle title update (can come in a separate session event)
                        if (sessionTitle && currentStreamSessionId && user) {
                          try {
                            console.log('Updating session title:', sessionTitle, 'for session:', currentStreamSessionId);
                            await supabase
                              .from('chat_sessions')
                              .update({ session_name: sessionTitle })
                              .eq('id', currentStreamSessionId)
                              .eq('user_id', user.id);
                            
                            // Refresh the sessions list in sidebar
                            setSessionRefreshTrigger(prev => prev + 1);
                          } catch (e) {
                            console.warn('Failed to update session title', e);
                          }
                        }
                        
                        setMessages(prev => prev.map((msg) => 
                          msg.id === aiMessageId 
                            ? { ...msg, sessionInfo, isStreaming: true }
                            : msg
                        ));
                        break;
                      }
                      case 'message_id':
                        messageInfo = parsedChunk.data;
                        setMessages(prev => prev.map((msg) => 
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
                      case 'message':
                        if (parsedChunk.data?.delta) {
                          aiResponse += parsedChunk.data.delta;
                          // Clean leading zeros and numbers
                          let cleanedResponse = aiResponse.replace(/^[0-9\s]+/, '').trim();
                          setMessages(prev => prev.map(msg => 
                            msg.id === aiMessageId 
                              ? { ...msg, content: cleanedResponse, isStreaming: true }
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
                      
                      // Clean leading zeros and numbers from the accumulated response
                      let cleanedResponse = aiResponse.replace(/^[0-9\s]+/, '').trim();
                      
                      // Update UI in real-time with cleaned response
                      setMessages(prev => prev.map(msg => 
                        msg.id === aiMessageId 
                          ? { ...msg, content: cleanedResponse, isStreaming: true }
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
            } else if (data.response) {
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

      // Clean the response - remove leading/trailing numbers, zeros, and unwanted characters
      if (aiResponse) {
        // Remove any leading digits, zeros, and whitespace
        aiResponse = aiResponse.replace(/^[0-9\s]+/, '').trim();
        // Remove any trailing digits, zeros, and whitespace
        aiResponse = aiResponse.replace(/[0-9\s]+$/, '').trim();
        // Remove leading punctuation except meaningful characters for Bengali/other languages
        aiResponse = aiResponse.replace(/^[^\w\u0980-\u09FF\u4e00-\u9fff\u0600-\u06ff]+/, '').trim();
      }
      
      if (aiReasoning) {
        aiReasoning = aiReasoning.replace(/^[0-9\s]+/, '').trim();
        aiReasoning = aiReasoning.replace(/[0-9\s]+$/, '').trim();
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
              debugData: {
                ...data,
                webhookRequest: payload, // Add request payload to debug data
                webhookResponse: data,
              }, 
              waitingTime: finalWaitingTime,
              sessionInfo,
              messageInfo,
              statusInfo,
              usedTenergy
            }
          : msg
      ));

      // Store the complete conversation in database
      const dbId = await storeMessageInDatabase(
        userMessage.content,
        payload,
        data,
        aiResponse,
        (messageInfo?.id ?? currentMessageId).toString(),
        (sessionInfo?.id ?? currentSessionId) as number,
        sessionInfo?.id
      );

      // Update AI message with database ID for feedback functionality
      if (dbId) {
        setMessages(prev => prev.map((msg) => 
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
      
      setMessages(prev => prev.map((msg) => 
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

  // Compute dynamic bottom padding so the last message isn't hidden
  const computedBottomPad = Math.max(
    96, // base padding
    (inputBarRef.current?.offsetHeight || 80) + (kbInset || 0) + 16
  );

  // Ensure we scroll to bottom on input focus
  const handleTextareaFocus = () => {
    setIsInputFocused(true);
    scrollToBottom();
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ block: 'nearest' });
      chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, 250);
  };
  const handleTextareaBlur = () => setIsInputFocused(false);

  return (
    <div className="flex bg-background" style={{ minHeight: '100svh' }}>
      {/* Sidebar + Main */}
      <div className={cn("flex flex-col flex-1 transition-all duration-300", isSidebarOpen ? "md:ml-80" : "ml-0")}> 
        {/* Header */}
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 pt-safe">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <SessionSidebar 
                ref={sessionSidebarRef}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                currentSessionId={currentSessionId}
                onSessionSelect={handleSessionSelect}
              />
              <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-elegant">
                <img 
                  src={tentenIcon} 
                  alt="TenTen AI" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-lg font-semibold gradient-text">TenTen AI - Dev Mode</h1>
                <p className="text-sm text-muted-foreground">HIGHLY CONFIDENTIAL</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mobile Subject Selector (Sheet) */}
              <Sheet open={isSubjectSheetOpen} onOpenChange={setIsSubjectSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 sm:hidden"
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
                className="flex items-center gap-2 h-9 w-9 sm:hidden"
                aria-label="New Chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="items-center gap-2 hidden sm:flex"
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
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 w-9 sm:hidden"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSettingsOpen(true)}
                className="items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 hidden sm:flex"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Settings</span>
              </Button>
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto chat-scroll px-3 sm:px-4"
        style={{ paddingBottom: `${computedBottomPad}px` }}
        onClick={() => textareaRef.current?.blur()}
      >
        {messages.length === 0 ? (
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
              <ChatMessage key={message.id} message={message} sessionId={currentSessionId ?? undefined} userAvatarUrl={userProfile?.avatar_url || user?.user_metadata?.avatar_url} />
            ))}
            {isLoading && waitingTime > 0 && (
              <div className="flex gap-3 p-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
                <div className="message-bubble ai max-w-[85%] sm:max-w-[70%] px-3 py-2 sm:px-4 sm:py-3">
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
      <div
        ref={inputBarRef}
        className="border-t border-border bg-card/80 backdrop-blur-sm p-4 sm:sticky sm:bottom-0 z-20 pb-safe"
        style={isMobile && isInputFocused ? { position: 'fixed', bottom: `${kbInset}px`, left: 0, right: 0 } : undefined}
      >
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
              onFocus={handleTextareaFocus}
              onBlur={handleTextareaBlur}
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
          aria-label="Upload image files"
        />
        
        <p className="text-xs text-muted-foreground text-center mt-2">
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