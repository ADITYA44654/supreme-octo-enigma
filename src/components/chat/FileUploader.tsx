import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2, X, File, Image, Video, Music, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateFile, formatFileSize } from "@/lib/fileValidation";
import { checkRateLimit, getRateLimitMessage } from "@/lib/rateLimiter";

interface FileUploaderProps {
  userId: string;
  conversationId: string;
  onFileUploaded: (url: string, fileName: string, fileType: string, fileSize: number) => void;
}

const FileUploader = ({ userId, conversationId, onFileUploaded }: FileUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    return File;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file before selecting
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    // Check rate limit
    const rateLimit = checkRateLimit(userId, 'file_upload');
    if (!rateLimit.allowed) {
      toast.error(getRateLimitMessage('file_upload', rateLimit.retryAfter!));
      return;
    }

    // Re-validate before upload
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      toast.error(validation.error);
      cancelUpload();
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}/${conversationId}/${Date.now()}.${fileExt}`;

      // Simulated progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, selectedFile);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      // Determine file type for display
      let fileType = 'file';
      if (selectedFile.type.startsWith('image/')) fileType = 'image';
      else if (selectedFile.type.startsWith('video/')) fileType = 'video';
      else if (selectedFile.type.startsWith('audio/')) fileType = 'audio';

      onFileUploaded(publicUrl, selectedFile.name, fileType, selectedFile.size);
      setSelectedFile(null);
      setUploadProgress(0);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast.error('Failed to upload file');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (selectedFile) {
    const FileIcon = getFileIcon(selectedFile.type);

    return (
      <div className="flex items-center gap-2 max-w-[200px] sm:max-w-[250px]">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileIcon className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-xs">{selectedFile.name}</p>
          {isUploading && (
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={cancelUpload}
          disabled={isUploading}
          className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          onClick={uploadFile}
          disabled={isUploading}
          className="h-8 w-8 flex-shrink-0"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        className="text-muted-foreground hover:text-foreground flex-shrink-0 rounded-xl"
      >
        <Paperclip className="h-5 w-5" />
      </Button>
    </>
  );
};

export default FileUploader;
