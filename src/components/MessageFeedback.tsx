import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MessageFeedbackProps {
  messageId: string;
  sessionId: string;
}

export const MessageFeedback = ({ messageId, sessionId }: MessageFeedbackProps) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<'helpful' | 'needs_improvement' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFeedback = async (type: 'helpful' | 'needs_improvement') => {
    if (!user || loading) return;

    setLoading(true);
    try {
      // First, check if feedback already exists
      const { data: existingFeedback } = await supabase
        .from('message_feedback')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .single();

      if (existingFeedback) {
        // Update existing feedback
        const { error } = await supabase
          .from('message_feedback')
          .update({ feedback_type: type })
          .eq('id', existingFeedback.id);

        if (error) throw error;
      } else {
        // Create new feedback
        const { error } = await supabase
          .from('message_feedback')
          .insert({
            message_id: messageId,
            session_id: sessionId,
            user_id: user.id,
            feedback_type: type
          });

        if (error) throw error;
      }

      setFeedback(type);
      toast.success(type === 'helpful' ? 'Thanks for the positive feedback!' : 'Thanks for the feedback! We\'ll use it to improve.');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback('helpful')}
        disabled={loading}
        className={`flex items-center gap-1 ${
          feedback === 'helpful' ? 'text-green-600 bg-green-50' : ''
        }`}
      >
        <ThumbsUp className={`h-4 w-4 ${feedback === 'helpful' ? 'fill-current' : ''}`} />
        Helpful
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleFeedback('needs_improvement')}
        disabled={loading}
        className={`flex items-center gap-1 ${
          feedback === 'needs_improvement' ? 'text-red-600 bg-red-50' : ''
        }`}
      >
        <ThumbsDown className={`h-4 w-4 ${feedback === 'needs_improvement' ? 'fill-current' : ''}`} />
        Needs improvement
      </Button>
    </div>
  );
};