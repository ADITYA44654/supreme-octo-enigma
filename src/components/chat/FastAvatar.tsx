import { useState } from "react";
import { cn } from "@/lib/utils";

interface FastAvatarProps {
  src: string | null | undefined;
  seed: string;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  className?: string;
}

// Use initials style - loads instantly, very lightweight
const getInitialsAvatar = (seed: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=c084fc,a855f7,9333ea,7c3aed&backgroundType=gradientLinear`;
};

// Pixel sizes for guaranteed consistency
const sizes = {
  sm: 32,
  md: 48,
  lg: 56,
  xl: 64,
};

const onlineIndicatorSizes = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
};

const FastAvatar = ({
  src,
  seed,
  alt = "Avatar",
  size = "md",
  isOnline,
  className,
}: FastAvatarProps) => {
  const [imgError, setImgError] = useState(false);
  const px = sizes[size];
  const onlinePx = onlineIndicatorSizes[size];

  const avatarSrc = imgError || !src ? getInitialsAvatar(seed) : src;

  return (
    <div 
      className={cn("relative flex-shrink-0", className)}
      style={{ width: px, height: px }}
    >
      <img
        src={avatarSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
        style={{ width: px, height: px }}
        className="rounded-full object-cover bg-muted ring-2 ring-border"
      />
      
      {isOnline && (
        <span 
          className="absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-background"
          style={{ width: onlinePx, height: onlinePx }}
        />
      )}
    </div>
  );
};

export default FastAvatar;
