import { formatDistanceToNow } from "date-fns";
import { Conversation, currentUser } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

const ConversationItem = ({ conversation, isActive, onClick }: ConversationItemProps) => {
  const otherParticipant = conversation.type === 'direct'
    ? conversation.participants.find(p => p.id !== currentUser.id)
    : null;

  const displayName = conversation.type === 'group'
    ? conversation.name
    : otherParticipant?.username;

  const displayAvatar = conversation.type === 'group'
    ? conversation.avatar
    : otherParticipant?.avatar;

  const isOnline = conversation.type === 'direct' && otherParticipant?.isOnline;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300",
        isActive 
          ? "bg-primary/15 border border-primary/30 shadow-lg shadow-primary/10" 
          : "hover:bg-secondary border border-transparent"
      )}
    >
      <div className="relative flex-shrink-0">
        <img
          src={displayAvatar}
          alt={displayName}
          className="h-14 w-14 rounded-full bg-muted object-cover"
        />
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-online border-[3px] border-sidebar" />
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={cn(
            "font-semibold truncate text-base",
            isActive && "text-primary"
          )}>
            {displayName}
          </span>
          {conversation.lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(conversation.lastMessage.timestamp, { addSuffix: false })}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-2">
          {conversation.isTyping ? (
            <span className="text-sm text-typing flex items-center gap-2">
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-typing animate-typing-1" />
                <span className="h-1.5 w-1.5 rounded-full bg-typing animate-typing-2" />
                <span className="h-1.5 w-1.5 rounded-full bg-typing animate-typing-3" />
              </span>
              typing...
            </span>
          ) : (
            <span className="text-sm text-muted-foreground truncate">
              {conversation.lastMessage?.content}
            </span>
          )}
          
          {conversation.unreadCount > 0 && (
            <span className="flex-shrink-0 h-6 min-w-6 px-2 rounded-full gradient-primary text-xs font-bold text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ConversationItem;
