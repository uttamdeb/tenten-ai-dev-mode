import { Bot, User, ChevronDown, ChevronUp, Bug, Brain } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MessageFeedback } from "./MessageFeedback";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useApiConfig } from "@/hooks/useApiConfig";
import tentenIcon from "@/assets/tenten-icon.png";
import type { Json } from "@/integrations/supabase/types";

interface MessageDebugData {
  webhookRequest?: {
    thread_id?: number;
  };
  webhookResponse?: Json;
  finalResponse?: Json;
  fullResponse?: string;
  [key: string]: Json | { thread_id?: number } | undefined;
}

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
    reasoning?: string;
    debugData?: MessageDebugData;
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
    threadId?: number;
  };
  sessionId?: number;
  userAvatarUrl?: string;
}

export function ChatMessage({ message, sessionId, userAvatarUrl }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const { config, getApiUrl } = useApiConfig();
  const effectiveThreadId = message.threadId ?? message.debugData?.webhookRequest?.thread_id ?? config.threadId;

  return (
    <div className={cn(
      "flex gap-3 p-4 slide-up",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="nebula-glass w-9 h-9 rounded-full overflow-hidden bg-muted/40">
            <img src={tentenIcon} alt="TenTen AI" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
      
      <div className={cn(
        "message-bubble max-w-[85%] sm:max-w-[70%] px-3 py-2 sm:px-4 sm:py-3",
        isUser ? "user" : "ai"
      )}>
        {isUser ? (
          <>
            {/* Attachments for user messages */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => (
                    <div key={attachment.id} className="nebula-well w-24 h-24 rounded-[1rem] overflow-hidden bg-muted/20 p-1">
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        className="w-full h-full rounded-[0.8rem] object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(attachment.url, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm leading-7 whitespace-pre-wrap">
              {message.content}
            </p>
          </>
        ) : (
          <div className="text-sm space-y-3">
            {/* Session, Message Info, and Used Tenergy */}
            {(message.sessionInfo || message.messageInfo || message.usedTenergy !== undefined || effectiveThreadId !== undefined) && (
              <div className="nebula-well rounded-[1.1rem] px-3 py-2.5">
                {message.sessionInfo && (
                  <p className="text-[0.72rem] text-muted-foreground uppercase tracking-[0.16em]">
                    <span className="font-medium">Session ID:</span> {message.sessionInfo.id}
                  </p>
                )}
                {message.messageInfo && (
                  <p className="text-[0.72rem] text-muted-foreground uppercase tracking-[0.16em]">
                    <span className="font-medium">Message ID:</span> {message.messageInfo.id}
                  </p>
                )}
                {effectiveThreadId !== undefined && (
                  <p className="text-[0.72rem] text-muted-foreground uppercase tracking-[0.16em]">
                    <span className="font-medium">Thread ID:</span> {effectiveThreadId}
                  </p>
                )}
                {message.usedTenergy !== undefined && (
                  <p className="text-[0.72rem] text-muted-foreground uppercase tracking-[0.16em]">
                    <span className="font-medium">Used Tenergy:</span> {message.usedTenergy}
                  </p>
                )}
              </div>
            )}
            
            {/* Status Information */}
            {message.statusInfo && (
              <div className="rounded-[1.1rem] bg-[hsl(var(--success)/0.12)] px-3 py-2.5 outline outline-1 outline-[hsl(var(--success)/0.18)]">
                <p className="text-[0.72rem] uppercase tracking-[0.16em] text-[hsl(var(--success))] font-medium">
                  Status: {message.statusInfo.state}
                </p>
              </div>
            )}
            
            {message.waitingTime && message.waitingTime > 0 && (
              <div>
                <p className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
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
                    className="nebula-ghost-button h-8 rounded-full border-0 px-3 text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    {isReasoningOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    Show thinking
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="nebula-well rounded-[1.2rem] p-4">
                    <p className="text-sm text-muted-foreground italic leading-7">
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
                    className="nebula-ghost-button h-8 rounded-full border-0 px-3 text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                  >
                    <Bug className="h-3 w-3 mr-1" />
                    {isDebugOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    Debugging information
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="space-y-3">
                    {/* Server API Configuration */}
                    <div className="nebula-well rounded-[1.2rem] p-4">
                      <h4 className="eyebrow-label mb-3">Server API Configuration</h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">API Mode:</span>
                          <pre className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{config.mode}</pre>
                        </div>
                        <div>
                          <span className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">API URL:</span>
                          <pre className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{getApiUrl()}</pre>
                        </div>
                      </div>
                    </div>

                    {/* Request Body */}
                    {message.debugData.webhookRequest && (
                      <div className="nebula-well rounded-[1.2rem] p-4">
                        <h4 className="eyebrow-label mb-3">Request Body</h4>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-32 rounded-[1rem] bg-black/20 p-3">
                          {JSON.stringify(message.debugData.webhookRequest, null, 2)}
                        </pre>
                      </div>
                    )}

                    {message.debugData.webhookResponse && (
                      <div className="nebula-well rounded-[1.2rem] p-4">
                        <h4 className="eyebrow-label mb-3">Raw Webhook Response</h4>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-32 rounded-[1rem] bg-black/20 p-3">
                          {JSON.stringify(message.debugData.webhookResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                    {message.debugData.finalResponse && (
                      <div className="nebula-well rounded-[1.2rem] p-4">
                        <h4 className="eyebrow-label mb-3">Final Response</h4>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-32 rounded-[1rem] bg-black/20 p-3">
                          {JSON.stringify(message.debugData.finalResponse, null, 2)}
                        </pre>
                      </div>
                    )}
                    {message.debugData.fullResponse && (
                      <div className="nebula-well rounded-[1.2rem] p-4">
                        <h4 className="eyebrow-label mb-3">Full Payload (Streaming Events)</h4>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-64 scrollbar-thin rounded-[1rem] bg-black/20 p-3">
                          {message.debugData.fullResponse.length > 10000 
                            ? `${message.debugData.fullResponse.substring(0, 10000)}...\n\n[Truncated - Full payload is ${message.debugData.fullResponse.length} characters]`
                            : message.debugData.fullResponse
                          }
                        </pre>
                      </div>
                    )}
                    {!message.debugData.webhookRequest && !message.debugData.webhookResponse && !message.debugData.finalResponse && !message.debugData.messageInfo && (
                      <div className="nebula-well rounded-[1.2rem] p-4">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-48 rounded-[1rem] bg-black/20 p-3">
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
              <div className="typing-indicator mt-2 nebula-well rounded-full w-fit px-3 py-2">
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
          "text-[0.68rem] mt-3 uppercase tracking-[0.18em] opacity-70",
          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="nebula-glass w-9 h-9 rounded-full overflow-hidden bg-muted/40 flex items-center justify-center">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="You" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}