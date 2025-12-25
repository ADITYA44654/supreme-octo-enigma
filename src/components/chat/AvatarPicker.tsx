import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 10 categories x 100 avatars = 1000 total
const AVATAR_CATEGORIES = {
  "Popular": Array.from({ length: 100 }, (_, i) => `User${i + 1}`),
  "Animals": Array.from({ length: 100 }, (_, i) => `Animal${i + 1}`),
  "Fantasy": Array.from({ length: 100 }, (_, i) => `Fantasy${i + 1}`),
  "Nature": Array.from({ length: 100 }, (_, i) => `Nature${i + 1}`),
  "Space": Array.from({ length: 100 }, (_, i) => `Space${i + 1}`),
  "Tech": Array.from({ length: 100 }, (_, i) => `Tech${i + 1}`),
  "Sports": Array.from({ length: 100 }, (_, i) => `Sports${i + 1}`),
  "Food": Array.from({ length: 100 }, (_, i) => `Food${i + 1}`),
  "Music": Array.from({ length: 100 }, (_, i) => `Music${i + 1}`),
  "Colors": Array.from({ length: 100 }, (_, i) => `Color${i + 1}`),
};

const ALL_AVATAR_SEEDS = Object.values(AVATAR_CATEGORIES).flat();

const AVATAR_STYLES = [
  { id: "avataaars", name: "Cartoon" },
  { id: "bottts", name: "Robots" },
  { id: "fun-emoji", name: "Emoji" },
  { id: "lorelei", name: "Lorelei" },
  { id: "pixel-art", name: "Pixel" },
  { id: "adventurer", name: "Adventure" },
  { id: "big-smile", name: "Smile" },
  { id: "micah", name: "Micah" },
  { id: "initials", name: "Initials" },
  { id: "shapes", name: "Shapes" },
];

interface AvatarPickerProps {
  currentAvatar: string;
  userId: string;
  onAvatarChange: (url: string) => void;
}

const AvatarPicker = ({ currentAvatar, userId, onAvatarChange }: AvatarPickerProps) => {
  const [open, setOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("avataaars");
  const [selectedCategory, setSelectedCategory] = useState("Popular");
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const categories = Object.keys(AVATAR_CATEGORIES);
  
  const currentSeeds = searchTerm.trim()
    ? ALL_AVATAR_SEEDS.filter(seed => seed.toLowerCase().includes(searchTerm.toLowerCase()))
    : AVATAR_CATEGORIES[selectedCategory as keyof typeof AVATAR_CATEGORIES] || [];

  const getAvatarUrl = (seed: string, style: string) => {
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
  };

  const handleSelectAvatar = async (seed: string) => {
    const avatarUrl = getAvatarUrl(seed, selectedStyle);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

      if (error) throw error;
      
      onAvatarChange(avatarUrl);
      toast.success('Avatar updated!');
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update avatar');
    }
  };

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onAvatarChange(publicUrl);
      toast.success('Avatar uploaded!');
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="absolute inset-0 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Camera className="h-8 w-8 text-primary" />
        </button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-4 sm:p-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold">Choose Avatar</DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 sm:p-6 space-y-5">
            {/* Upload Custom */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/30">
              <div className="h-14 w-14 rounded-full overflow-hidden ring-2 ring-primary/30 flex-shrink-0">
                <img src={currentAvatar} alt="Current" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base">Upload Custom Photo</p>
                <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, GIF - Max 5MB</p>
              </div>
              <label className="cursor-pointer flex-shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button variant="default" size="sm" disabled={isUploading} asChild>
                  <span className="gap-2">
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span className="hidden sm:inline">Upload</span>
                  </span>
                </Button>
              </label>
            </div>

            {/* Style Selector */}
            <div>
              <p className="text-sm font-semibold mb-3">Avatar Style</p>
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-3">
                  {AVATAR_STYLES.map(style => (
                    <Button
                      key={style.id}
                      variant={selectedStyle === style.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedStyle(style.id)}
                      className="flex-shrink-0"
                    >
                      {style.name}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* Search */}
            <Input
              placeholder="Search 1000 avatars..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11"
            />

            {/* Category Selector */}
            {!searchTerm && (
              <div>
                <p className="text-sm font-semibold mb-3">Category</p>
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-3">
                    {categories.map(cat => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className="flex-shrink-0"
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Avatar Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {currentSeeds.map(seed => (
                <button
                  key={seed}
                  onClick={() => handleSelectAvatar(seed)}
                  className="group relative aspect-square rounded-xl overflow-hidden hover:ring-2 hover:ring-primary transition-all duration-200 hover:scale-[1.03] bg-muted border border-border/30"
                >
                  <img
                    src={getAvatarUrl(seed, selectedStyle)}
                    alt={seed}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-background/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs font-medium text-center px-1 truncate max-w-full">{seed}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-3 border-t border-border/50 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {searchTerm ? `Found ${currentSeeds.length} avatars` : `${ALL_AVATAR_SEEDS.length} avatars • 10 categories × 100 each`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarPicker;
