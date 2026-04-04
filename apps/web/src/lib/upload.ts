import type { Attachment } from "./trpc-types";
import type { trpc } from "./trpc";

type TrpcClient = ReturnType<typeof trpc.useUtils>;

export type UploadedFile = Attachment;

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!isImageType(file.type)) return null;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

export async function uploadFile(
  file: File,
  utils: TrpcClient,
): Promise<UploadedFile> {
  const contentType = file.type || "application/octet-stream";

  const [dimensions, presignedData] = await Promise.all([
    getImageDimensions(file),
    utils.client.uploads.getPresignedUrl.mutate({
      filename: file.name,
      contentType,
      size: file.size,
    }),
  ]);

  const { uploadUrl, publicUrl } = presignedData;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return {
    url: publicUrl,
    name: file.name,
    type: contentType,
    size: file.size,
    ...(dimensions && { width: dimensions.width, height: dimensions.height }),
  };
}

export async function uploadFileWithProgress(
  file: File,
  utils: TrpcClient,
  onProgress: (percent: number) => void,
): Promise<UploadedFile> {
  const contentType = file.type || "application/octet-stream";

  const [dimensions, presignedData] = await Promise.all([
    getImageDimensions(file),
    utils.client.uploads.getPresignedUrl.mutate({
      filename: file.name,
      contentType,
      size: file.size,
    }),
  ]);

  const { uploadUrl, publicUrl } = presignedData;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });

  return {
    url: publicUrl,
    name: file.name,
    type: contentType,
    size: file.size,
    ...(dimensions && { width: dimensions.width, height: dimensions.height }),
  };
}

export function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
