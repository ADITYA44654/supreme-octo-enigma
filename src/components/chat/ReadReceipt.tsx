import { Check, CheckCheck } from "lucide-react";

interface ReadReceiptProps {
  isRead: boolean | null;
  isDelivered?: boolean;
  isOwn: boolean;
}

const ReadReceipt = ({ isRead, isDelivered = true, isOwn }: ReadReceiptProps) => {
  if (!isOwn) return null;

  return (
    <span className="inline-flex ml-1">
      {isRead ? (
        <CheckCheck className="h-4 w-4 text-blue-500" />
      ) : isDelivered ? (
        <CheckCheck className="h-4 w-4 text-muted-foreground/60" />
      ) : (
        <Check className="h-4 w-4 text-muted-foreground/60" />
      )}
    </span>
  );
};

export default ReadReceipt;
