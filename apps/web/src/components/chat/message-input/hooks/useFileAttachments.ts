import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { uploadFileWithProgress, type UploadedFile } from "@/lib/upload";

type TRPCUtils = ReturnType<typeof trpc.useUtils>;

export function useFileAttachments() {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, number>>(
    new Map(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: File[]) => {
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  };

  const uploadFiles = async (utils: TRPCUtils): Promise<UploadedFile[]> => {
    setIsUploading(true);
    setUploadProgress(new Map());
    try {
      const uploaded = await Promise.all(
        pendingFiles.map((file, index) =>
          uploadFileWithProgress(file, utils, (percent) => {
            setUploadProgress((prev) => new Map(prev).set(index, percent));
          }),
        ),
      );
      return uploaded;
    } finally {
      setIsUploading(false);
      setUploadProgress(new Map());
    }
  };

  const resetFiles = () => {
    setPendingFiles([]);
    setUploadProgress(new Map());
  };

  return {
    pendingFiles,
    isUploading,
    uploadProgress,
    fileInputRef,
    addFiles,
    removeFile,
    uploadFiles,
    resetFiles,
  };
}
