import { format } from "date-fns";
import { Message, currentUser } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  senderAvatar?: string;
}

const MessageBubble = ({ message, showAvatar, senderAvatar }: MessageBubbleProps) => {
  const isSent = message.senderId === currentUser.id;

  return (
    <div className={cn(
      "flex items-end gap-3 animate-fade-in",
      isSent ? "flex-row-reverse" : "flex-row"
    )}>
      {showAvatar && !isSent && (
        <img
          src={senderAvatar}
          alt="Avatar"
          className="h-9 w-9 rounded-full flex-shrink-0 ring-2 ring-border"
        />
      )}
      {!showAvatar && !isSent && <div className="w-9" />}

      <div className={cn(
        "max-w-[70%] px-5 py-3.5 rounded-2xl shadow-lg",
        isSent 
          ? "gradient-primary text-primary-foreground rounded-br-md shadow-primary/20" 
          : "bg-secondary text-foreground rounded-bl-md"
      )}>
        <p className="text-[15px] leading-relaxed break-words">{message.content}</p>
        <div className={cn(
          "flex items-center gap-1.5 mt-2",
          isSent ? "justify-end" : "justify-start"
        )}>
          <span className={cn(
            "text-[11px] font-medium",
            isSent ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {format(message.timestamp, "HH:mm")}
          </span>
          {isSent && (
            message.isRead 
              ? <CheckCheck className="h-4 w-4 text-primary-foreground/70" />
              : <Check className="h-4 w-4 text-primary-foreground/70" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
