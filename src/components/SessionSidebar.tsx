import { useState, useEffect } from "react";
import { MessageCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ChatSession {
  id: number;
  session_name: string | null;
  created_at: string;
  message_count: number;
}

interface SessionSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentSessionId: number | null;
  onSessionSelect: (sessionId: number) => void;
}

export const SessionSidebar = ({ isOpen, onToggle, currentSessionId, onSessionSelect }: SessionSidebarProps) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          session_name,
          created_at,
          chat_messages(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSessions = data?.map(session => ({
        id: session.id,
        session_name: session.session_name,
        created_at: session.created_at,
        message_count: session.chat_messages?.[0]?.count || 0
      })) || [];

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'less than a minute ago';
    if (diffInHours < 24) return `about ${diffInHours} hours ago`;
    return `about ${Math.floor(diffInHours / 24)} days ago`;
  };

  const generateSessionName = (sessionId: number) => {
    return `Session ${sessionId.toString().padStart(6, '0')}`;
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="fixed left-4 top-4 z-50"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-background border-r z-40 flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Sessions</h2>
        <Button variant="ghost" size="icon" onClick={onToggle}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No sessions yet</div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={`w-full p-3 rounded-lg text-left hover:bg-accent transition-colors mb-2 ${
                  currentSessionId === session.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-5 w-5 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {session.session_name || generateSessionName(session.id)}
                    </h3>
                    <p className="text-sm opacity-70 mt-1">
                      {formatTimeAgo(session.created_at)}
                    </p>
                  </div>
                  <div className="text-xs opacity-60 flex-shrink-0">
                    {session.message_count}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};