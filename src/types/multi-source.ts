export type SourceType = 'youtube' | 'website' | 'pdf' | 'image' | 'text';

export interface SourceItem {
  id: string;
  type: SourceType;
  label: string;
  rawValue: string; // The URL or path
  content: string;  // The actual text content
  status: 'loading' | 'ready' | 'error';
  progress?: number;
  error?: string;
  originalFile?: string; // For images/PDFs
}
