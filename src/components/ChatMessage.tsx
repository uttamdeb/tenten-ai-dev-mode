import { Bot, User, ChevronDown, ChevronUp, Bug, Brain } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MessageFeedback } from "./MessageFeedback";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useApiConfig } from "@/hooks/useApiConfig";

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    reasoning?: string;
    debugData?: any;
    waitingTime?: number;
    attachments?: {
      id: string;
      url: string;
      name: string;
      size: number;
    }[];
    dbId?: string; // UUID from database
    sessionInfo?: { id: number };
    messageInfo?: { id: number };
    statusInfo?: { state: string };
    usedTenergy?: number;
  };
  sessionId?: number;
  userProfile?: any;
}

export function ChatMessage({ message, sessionId, userProfile }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const { config, getApiUrl } = useApiConfig();

  // Get user avatar - prioritize profile avatar, fallback to auth metadata
  const userAvatarUrl = userProfile?.avatar_url;
  const userInitial = userProfile?.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className={cn(
      "flex gap-2 md:gap-3 p-2 md:p-4 slide-up",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant">
            <Bot className="w-3 h-3 md:w-4 md:h-4 text-primary-foreground" />
          </div>
        </div>
      )}
      
      {isUser && userAvatarUrl && (
        <div className="flex-shrink-0 order-2">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shadow-elegant">
            <img 
              src={userAvatarUrl} 
              alt="User avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initial if image fails to load
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector('.fallback-initial')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'fallback-initial w-full h-full flex items-center justify-center bg-gradient-primary text-primary-foreground text-xs md:text-sm font-semibold';
                  fallback.textContent = userInitial;
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
        </div>
      )}
      
      <div className={cn(
        "message-bubble max-w-[90%] sm:max-w-[85%] md:max-w-[70%]",
        isUser ? "user order-1" : "ai"
      )}>
        {isUser ? (
          <>
            {/* Attachments for user messages */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2">
                <div className="flex flex-wrap gap-1 md:gap-2">
                  {message.attachments.map((attachment) => (
                    <div key={attachment.id} className="w-16 h-16 md:w-24 md:h-24 rounded-lg overflow-hidden border border-border bg-muted/20">
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(attachment.url, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </>
        ) : (
          <div className="text-xs md:text-sm">
            {/* Session, Message Info, and Used Tenergy */}
            {(message.sessionInfo || message.messageInfo || message.usedTenergy !== undefined) && (
              <div className="mb-2 p-1.5 md:p-2 bg-muted/30 rounded-lg border border-border">
                {message.sessionInfo && (
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    <span className="font-medium">Session ID:</span> {message.sessionInfo.id}
                  </p>
                )}
                {message.messageInfo && (
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    <span className="font-medium">Message ID:</span> {message.messageInfo.id}
                  </p>
                )}
                {message.usedTenergy !== undefined && (
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    <span className="font-medium">Used Tenergy:</span> {message.usedTenergy}
                  </p>
                )}
              </div>
            )}
            
            {/* Status Information */}
            {message.statusInfo && (
              <div className="mb-2 p-1.5 md:p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-[10px] md:text-xs text-blue-700 dark:text-blue-300 font-medium truncate">
                  Status: {message.statusInfo.state}
                </p>
              </div>
            )}
            
            {message.waitingTime && message.waitingTime > 0 && (
              <div className="mb-2">
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Thought for {message.waitingTime} seconds
                </p>
              </div>
            )}
            {message.reasoning && (
              <Collapsible open={isReasoningOpen} onOpenChange={setIsReasoningOpen}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 md:h-6 text-[10px] md:text-xs text-muted-foreground hover:text-foreground mb-2 p-1"
                  >
                    <Brain className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                    {isReasoningOpen ? <ChevronUp className="h-2.5 w-2.5 md:h-3 md:w-3 ml-0.5 md:ml-1" /> : <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3 ml-0.5 md:ml-1" />}
                    Show thinking
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mb-2 md:mb-3">
                  <div className="p-2 md:p-3 bg-muted/50 rounded-lg border-l-2 border-primary/30">
                    <p className="text-[10px] md:text-xs text-muted-foreground italic">
                      {message.reasoning}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            {message.debugData && (
              <Collapsible open={isDebugOpen} onOpenChange={setIsDebugOpen}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 md:h-6 text-[10px] md:text-xs text-muted-foreground hover:text-foreground mb-2 p-1"
                  >
                    <Bug className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                    {isDebugOpen ? <ChevronUp className="h-2.5 w-2.5 md:h-3 md:w-3 ml-0.5 md:ml-1" /> : <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3 ml-0.5 md:ml-1" />}
                    Debugging information
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mb-2 md:mb-3">
                  <div className="space-y-2 md:space-y-3">
                    {/* Server API Configuration */}
                    <div className="p-2 md:p-3 bg-muted/50 rounded-lg border border-border">
                      <h4 className="text-[10px] md:text-xs font-medium text-foreground mb-1.5 md:mb-2">Server API Configuration</h4>
                      <div className="space-y-1 md:space-y-2">
                        <div>
                          <span className="text-[10px] md:text-xs font-medium text-muted-foreground">API Mode:</span>
                          <pre className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">{config.mode}</pre>
                        </div>
                        <div>
                          <span className="text-[10px] md:text-xs font-medium text-muted-foreground">API URL:</span>
                          <pre className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 break-all">{getApiUrl()}</pre>
                        </div>
                      </div>
                    </div>

                    {/* Request Body */}
                    {message.debugData.webhookRequest && (
                      <div className="p-2 md:p-3 bg-muted/50 rounded-lg border border-border">
                        <h4 className="text-[10px] md:text-xs font-medium text-foreground mb-1.5 md:mb-2">Request Body</h4>
                        <pre className="text-[9px] md:text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-24 md:max-h-32">
                          {JSON.stringify(message.debugData.webhookRequest, null, 2)}
                        </pre>
                      </div>
                    )}

                    {message.debugData.webhookResponse && (
                      <div className="p-2 md:p-3 bg-muted/50 rounded-lg border border-border">
                        <h4 className="text-[10px] md:text-xs font-medium text-foreground mb-1.5 md:mb-2">Raw Webhook Response</h4>
                        <pre className="text-[9px] md:text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-24 md:max-h-32">
                          {JSON.stringify(message.debugData.webhookResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                    {message.debugData.finalResponse && (
                      <div className="p-2 md:p-3 bg-muted/50 rounded-lg border border-border">
                        <h4 className="text-[10px] md:text-xs font-medium text-foreground mb-1.5 md:mb-2">Final Response</h4>
                        <pre className="text-[9px] md:text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-24 md:max-h-32">
                          {JSON.stringify(message.debugData.finalResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                    {message.debugData.fullResponse && (
                      <div className="p-2 md:p-3 bg-muted/50 rounded-lg border border-border">
                        <h4 className="text-[10px] md:text-xs font-medium text-foreground mb-1.5 md:mb-2">Full Payload (Streaming Events)</h4>
                        <pre className="text-[9px] md:text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-32 md:max-h-64 scrollbar-thin">
                          {message.debugData.fullResponse.length > 10000 
                            ? `${message.debugData.fullResponse.substring(0, 10000)}...\n\n[Truncated - Full payload is ${message.debugData.fullResponse.length} characters]`
                            : message.debugData.fullResponse
                          }
                        </pre>
                      </div>
                    )}
                    {!message.debugData.webhookRequest && !message.debugData.webhookResponse && !message.debugData.finalResponse && !message.debugData.messageInfo && (
                      <div className="p-2 md:p-3 bg-muted/50 rounded-lg border border-border">
                        <pre className="text-[9px] md:text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-32 md:max-h-48">
                          {JSON.stringify(message.debugData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
            <MarkdownRenderer>
              {message.content}
            </MarkdownRenderer>
            {isStreaming && (
              <div className="typing-indicator mt-2">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
            {!isStreaming && sessionId && message.dbId && (
              <MessageFeedback messageId={message.dbId} sessionId={sessionId} />
            )}
          </div>
        )}
        
        <div className={cn(
          "text-[10px] md:text-xs mt-1.5 md:mt-2 opacity-70",
          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
}