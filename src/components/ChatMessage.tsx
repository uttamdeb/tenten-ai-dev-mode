import { Bot, User, ChevronDown, ChevronUp, Bug, Brain } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { QuizRenderer } from "./QuizRenderer";
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
    attachments?: {
      id: string;
      url: string;
      name: string;
      size: number;
    }[];
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;
  const [isReasoningOpen, setIsReasoningOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // Function to check if content is in quiz format
  const isQuizContent = (content: string): boolean => {
    try {
      const parsed = JSON.parse(content.trim());
      return Array.isArray(parsed) && 
             parsed.length > 0 && 
             parsed.every(item => 
               item.hasOwnProperty('num') && 
               item.hasOwnProperty('question_raw') && 
               item.hasOwnProperty('options_raw') && 
               item.hasOwnProperty('answer_letter') && 
               item.hasOwnProperty('answer_bn') && 
               item.hasOwnProperty('reason_bn') &&
               Array.isArray(item.options_raw)
             );
    } catch {
      return false;
    }
  };

  const parseQuizContent = (content: string) => {
    try {
      return JSON.parse(content.trim());
    } catch {
      return null;
    }
  };

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
          <>
            {/* Attachments for user messages */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2">
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => (
                    <div key={attachment.id} className="w-24 h-24 rounded-lg overflow-hidden border border-border bg-muted/20">
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
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </>
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
            {/* Render quiz content or markdown based on content type */}
            {isQuizContent(message.content) ? (
              <QuizRenderer questions={parseQuizContent(message.content)} />
            ) : (
              <MarkdownRenderer>
                {message.content}
              </MarkdownRenderer>
            )}
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