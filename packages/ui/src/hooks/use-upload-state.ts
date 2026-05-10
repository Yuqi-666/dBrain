import { useState } from "react";

export interface UseUploadStateOptions {
  nodeId: string;
  onUploadComplete?: (attachment: { url: string }) => void;
  onUploadError?: (error: Error) => void;
}

export interface UseUploadStateReturn {
  isLoading: boolean;
  handlers: {
    onUploadStart: () => void;
    onUploadComplete: (attachment: { url: string }) => void;
    onUploadError: (error: Error) => void;
  };
}

export function useUploadState(
  options: UseUploadStateOptions,
): UseUploadStateReturn {
  const {
    onUploadComplete: onUploadCompleteCallback,
    onUploadError: onUploadErrorCallback,
  } = options;
  const [isLoading, setIsLoading] = useState(false);

  const handlers = {
    onUploadStart: () => {
      setIsLoading(true);
    },

    onUploadComplete: (attachment: { url: string }) => {
      setIsLoading(false);
      if (onUploadCompleteCallback) {
        onUploadCompleteCallback(attachment);
      }
    },

    onUploadError: (error: Error) => {
      setIsLoading(false);
      if (onUploadErrorCallback) {
        onUploadErrorCallback(error);
      }
    },
  };

  return {
    isLoading,
    handlers,
  };
}
