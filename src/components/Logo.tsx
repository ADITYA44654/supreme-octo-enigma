import { Sword } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 32,
  };

  const textClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 rotate-[-10deg] hover:rotate-0 transition-transform duration-300`}>
        <Sword className="text-primary-foreground" size={iconSizes[size]} />
      </div>
      {showText && (
        <span className={`${textClasses[size]} font-bold tracking-tight`}>
          <span className="text-foreground">Esp</span>
          <span className="gradient-text">ada</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
