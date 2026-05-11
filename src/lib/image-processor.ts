
/**
 * Client-side image processing utilities.
 */

/**
 * Resizes an image (Data URI) to a maximum dimension while maintaining aspect ratio.
 * This helps avoid sessionStorage quota limits and reduces AI processing latency.
 * 
 * @param dataUri The original base64/data URI image
 * @param maxDimension Maximum width or height in pixels
 * @param quality JPEG quality (0.0 to 1.0)
 * @returns Promise resolving to a smaller data URI (image/jpeg)
 */
export async function resizeImage(dataUri: string, maxDimension = 2048, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG for better compression than PNG
      const resizedDataUri = canvas.toDataURL('image/jpeg', quality);
      resolve(resizedDataUri);
    };

    img.onerror = () => reject(new Error('Failed to load image for resizing'));
    img.src = dataUri;
  });
}

/**
 * Checks the approximate size of a base64 string in MB.
 */
export function getBase64SizeMB(base64String: string): number {
  const stringLength = base64String.length - (base64String.indexOf(',') + 1);
  const sizeInBytes = (stringLength * 3) / 4;
  return sizeInBytes / (1024 * 1024);
}
