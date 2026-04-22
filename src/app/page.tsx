import { Metadata } from 'next';
import Home from './HomeClient';

export const metadata: Metadata = {
  title: 'MindScape - AI-Powered Mind Mapping & Knowledge Visualization',
  description: 'Everything starts with a thought. Transform your unstructured ideas into clear, explorable knowledge graphs with MindScape\'s next-gen AI mind mapping tool.',
  openGraph: {
    title: 'MindScape - Transform Thoughts into Knowledge',
    description: 'The ultimate AI-powered mind mapping tool for students, researchers, and creators.',
    images: ['/MindScape-Logo.png'],
  },
};

export default function Page() {
  return <Home />;
}
