import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import ConversationsSidebar from "@/components/chat/ConversationsSidebar";
import ChatArea from "@/components/chat/ChatArea";
import { ConversationWithDetails, useConversations } from "@/hooks/useRealTimeMessages";
import { usePresence } from "@/hooks/usePresence";

const Chat = () => {
  const [activeConversation, setActiveConversation] = useState<ConversationWithDetails | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isUserOnline } = usePresence();
  const { refetch: refetchConversations } = useConversations();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    setActiveConversation(conversation);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleBack = () => {
    setShowSidebar(true);
    setActiveConversation(null);
  };

  const handleMessagesRead = useCallback(() => {
    // Refetch conversations to update unread counts
    refetchConversations();
  }, [refetchConversations]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 flex-shrink-0 transition-transform duration-300",
        !showSidebar && "hidden md:block"
      )}>
        <ConversationsSidebar
          activeConversation={activeConversation}
          onSelectConversation={handleSelectConversation}
          isUserOnline={isUserOnline}
        />
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1",
        showSidebar && "hidden md:flex"
      )}>
        <ChatArea
          conversation={activeConversation}
          onBack={handleBack}
          isUserOnline={isUserOnline}
          onMessagesRead={handleMessagesRead}
        />
      </div>
    </div>
  );
};

export default Chat;
