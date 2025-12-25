// File validation utilities for secure uploads

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VOICE_NOTE_DURATION = 300; // 5 minutes in seconds
export const MAX_VOICE_NOTE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
  '.msi', '.scr', '.pif', '.com', '.dll', '.sys', '.app',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const validateFile = (file: File): FileValidationResult => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  // Check file size is not zero
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type !== '') {
    return {
      valid: false,
      error: 'File type not allowed. Allowed: images, videos, audio, PDFs, and documents',
    };
  }

  // Check for blocked extensions
  const fileName = file.name.toLowerCase();
  for (const ext of BLOCKED_EXTENSIONS) {
    if (fileName.endsWith(ext)) {
      return {
        valid: false,
        error: 'This file type is not allowed for security reasons',
      };
    }
  }

  return { valid: true };
};

export const validateVoiceNote = (blob: Blob, duration: number): FileValidationResult => {
  if (blob.size > MAX_VOICE_NOTE_SIZE) {
    return {
      valid: false,
      error: `Voice note too large. Maximum size is ${MAX_VOICE_NOTE_SIZE / (1024 * 1024)}MB`,
    };
  }

  if (duration > MAX_VOICE_NOTE_DURATION) {
    return {
      valid: false,
      error: `Voice note too long. Maximum duration is ${MAX_VOICE_NOTE_DURATION / 60} minutes`,
    };
  }

  return { valid: true };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
