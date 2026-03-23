import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
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

export interface SessionSidebarHandle {
  refresh: () => void;
}

export const SessionSidebar = forwardRef<SessionSidebarHandle, SessionSidebarProps>(
  ({ isOpen, onToggle, currentSessionId, onSessionSelect }, ref) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refresh: fetchSessions
  }));

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
        className="nebula-ghost-button shrink-0 rounded-full border-0"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>
    );
  }

  // When open, render into a portal so it is not clipped by header/backdrop contexts
  return createPortal(
    <div className="fixed left-0 top-0 h-screen w-80 z-[100] flex flex-col bg-[hsl(var(--sidebar-background)/0.92)] backdrop-blur-3xl shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow-label mb-2">History</p>
            <h2 className="text-2xl font-semibold">Recent Sessions</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle} className="nebula-ghost-button rounded-full border-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-6">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No sessions yet</div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                data-active={currentSessionId === session.id}
                className="nebula-sidebar-item w-full rounded-[1.1rem] px-4 py-3 text-left transition-colors mb-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate text-sm">
                      {session.session_name || generateSessionName(session.id)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(session.created_at)}
                    </p>
                  </div>
                  <div className="text-[0.7rem] text-muted-foreground flex-shrink-0 rounded-full bg-white/5 px-2 py-1">
                    {session.message_count}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>,
    document.body
  );
});