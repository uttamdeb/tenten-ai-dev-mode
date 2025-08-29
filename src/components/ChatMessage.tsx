import { Bot, User, ChevronDown, ChevronUp, Bug, Brain } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  return (
    <div className={cn(
      "flex gap-3 p-4 slide-up",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shadow-elegant">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      )}
      
      <div className={cn(
        "message-bubble max-w-[85%] sm:max-w-[70%]",
        isUser ? "user" : "ai"
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <div className="text-sm">
            {message.waitingTime && message.waitingTime > 0 && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground">
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
                    className="h-6 text-xs text-muted-foreground hover:text-foreground mb-2 p-1"
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    {isReasoningOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    Show thinking
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mb-3">
                  <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary/30">
                    <p className="text-xs text-muted-foreground italic">
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
                    className="h-6 text-xs text-muted-foreground hover:text-foreground mb-2 p-1"
                  >
                    <Bug className="h-3 w-3 mr-1" />
                    {isDebugOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                    Debugging information
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mb-3">
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-auto max-h-48">
                      {JSON.stringify(message.debugData, null, 2)}
                    </pre>
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
          </div>
        )}
        
        <div className={cn(
          "text-xs mt-2 opacity-70",
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
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}