declare module 'pdfjs-dist/legacy/build/pdf' {
  export const version: string;
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
  export function getDocument(config: { data: ArrayBuffer }): {
    promise: Promise<PDFDocumentProxy>;
  };
  
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }
  
  export interface PDFPageProxy {
    getTextContent(): Promise<{
      items: Array<{ str: string }>;
    }>;
  }
}
