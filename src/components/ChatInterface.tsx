import { useState, useRef, useEffect } from "react";
import { Send, Settings, Zap, Bot, Paperclip, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage } from "./ChatMessage";
import { SubjectSelector, Subject } from "./SubjectSelector";
import { ThemeToggle } from "./ThemeToggle";
import UserMenu from "./UserMenu";
import { useToast } from "@/hooks/use-toast";
import { useImageUpload } from "@/hooks/useImageUpload";
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
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("https://n8n-prod.10minuteschool.com/webhook/supersolve-ai-v1");
  const [showSettings, setShowSettings] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ImageAttachment[]>([]);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [waitingTime, setWaitingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadImage, isUploading } = useImageUpload();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    
    if (!webhookUrl.trim()) {
      toast({
        title: "Webhook URL Required",
        description: "Please configure your n8n webhook URL in settings.",
        variant: "destructive",
      });
      setShowSettings(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
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
    const aiMessageId = (Date.now() + 1).toString();
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
      // Prepare webhook payload
      const webhookPayload = {
        auth_user_id: "623a3187fb492fa5df0c2277", // Static for now
        user_name: "Abdullah Abyad Raied 1111", // Static for now  
        session_id: Date.now().toString().slice(-6), // Generate session ID
        live_class_id: "NoVKlRff9E", // Static for now
        date: Date.now(),
        question: userMessage.content,
        messageId: userMessage.id,
        program_name: selectedSubject?.label || "General",
        attachments: userMessage.attachments?.map(att => att.url) || []
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data;
      let aiResponse = "";
      let aiReasoning = "";
      
      try {
        const responseText = await response.text();
        console.log("Raw webhook response:", responseText); // Debug log
        
        if (responseText.trim()) {
          data = JSON.parse(responseText);
          console.log("Parsed webhook data:", data); // Debug log
          
          // Handle n8n workflow response format
          const responseData = Array.isArray(data) ? data[0] : data;
          
          // Extract AI response from content_blocks structure
          if (responseData?.ai_response?.content_blocks?.[0]?.data?.content) {
            aiResponse = responseData.ai_response.content_blocks[0].data.content;
            aiReasoning = responseData.ai_reasoning || "";
          }
          // Handle content_blocks at root level (second response format)
          else if (responseData?.content_blocks?.[0]?.data?.content) {
            aiResponse = responseData.content_blocks[0].data.content;
            aiReasoning = responseData.ai_reasoning || "";
          }
          // Fallback to other possible response formats
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
          
          console.log("Final AI response:", aiResponse); // Debug log
        } else {
          aiResponse = "I received your message and processed it through the n8n workflow.";
        }
      } catch (parseError) {
        console.warn("Failed to parse webhook response as JSON:", parseError);
        aiResponse = "I received your message and processed it through the n8n workflow.";
      }

      // Simulate streaming effect for better UX
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

      // Final update to remove streaming indicator and store debug data
      const finalWaitingTime = waitingTime;
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: aiResponse, isStreaming: false, reasoning: aiReasoning, debugData: data, waitingTime: finalWaitingTime }
          : msg
      ));

    } catch (error) {
      console.error("Error calling n8n webhook:", error);
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { 
              ...msg, 
              content: "Sorry, I encountered an error while processing your request. Please check your webhook URL and try again.",
              isStreaming: false 
            }
          : msg
      ));

      toast({
        title: "Error",
        description: "Failed to connect to n8n webhook. Please check your configuration.",
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
    <div className="flex flex-col h-screen bg-gradient-chat">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-elegant">
              <img 
                src={tentenIcon} 
                alt="TenTen AI" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold gradient-text">TenTen AI - Dev Mode</h1>
              <p className="text-sm text-muted-foreground">AI-powered academic assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="h-9 w-9"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Subject Selector */}
        <div className="px-4 pb-4">
          <SubjectSelector 
            selectedSubject={selectedSubject}
            onSubjectChange={setSelectedSubject}
          />
          {selectedSubject && (
            <div className="mt-2">
              <span className="subject-badge">
                {selectedSubject.label}
              </span>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className="mx-4 mb-4 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                n8n Webhook Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="webhook-url" className="text-sm font-medium">
                  Webhook URL
                </Label>
                <Input
                  id="webhook-url"
                  placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your n8n webhook URL to enable AI processing
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </header>

      {/* Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto chat-scroll pb-4">
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
            {!webhookUrl && (
              <p className="text-sm text-destructive mt-3">
                Configure your n8n webhook URL in settings to get started
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 px-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
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
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          TenTen can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}