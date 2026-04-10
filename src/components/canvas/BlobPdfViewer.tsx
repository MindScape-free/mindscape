'use client';

import { useEffect, useState } from 'react';

interface BlobPdfViewerProps {
  dataUri: string;
  className?: string;
}

export function BlobPdfViewer({ dataUri, className }: BlobPdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string>('');

  useEffect(() => {
    if (!dataUri) return;
    
    let isMounted = true;
    let objectUrl = '';

    if (dataUri.startsWith('data:')) {
      try {
        const arr = dataUri.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        objectUrl = URL.createObjectURL(blob);
        if (isMounted) {
          setBlobUrl(objectUrl + '#toolbar=0');
        }
      } catch (e) {
        console.error('Failed to convert base64 to blob', e);
        if (isMounted) setBlobUrl(dataUri);
      }
    } else if (dataUri.startsWith('http')) {
      fetch(dataUri)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch PDF');
          return res.blob();
        })
        .then(blob => {
          if (isMounted) {
            objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl + '#toolbar=0');
          }
        })
        .catch(e => {
          console.error('Failed to fetch PDF blob to bypass X-Frame-Options', e);
          if (isMounted) setBlobUrl(dataUri);
        });
    } else {
      setBlobUrl(dataUri);
    }

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dataUri]);

  if (!blobUrl) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 font-bold uppercase tracking-widest text-xs animate-pulse">
        Processing Document...
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      className={className || "w-full h-full border-none"}
      title="PDF Document Viewer"
    />
  );
}
