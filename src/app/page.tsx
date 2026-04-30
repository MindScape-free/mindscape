import { Metadata } from 'next';
import Home from './HomeClient';

export const metadata: Metadata = {
  title: 'MindScape | AI Knowledge Graph & Mind Map Generator',
  description: 'Transform complex information into actionable knowledge. MindScape is a professional AI-powered tool that synthesizes PDFs, videos, and research into interactive, explorable knowledge graphs.',
  keywords: ['AI Mind Map Generator', 'Knowledge Graph Generator', 'Visual Intelligence Engine', 'Research Synthesis Tool', 'AI Learning Platform'],
  openGraph: {
    title: 'MindScape - Professional AI Knowledge Visualization',
    description: 'Transform information into actionable knowledge with next-gen AI mind mapping.',
    images: ['/MindScape-Logo.png'],
  },
};

export default function Page() {
  return <Home />;
}
