import { Metadata } from 'next';
import CommunityPage from './CommunityClient';

export const metadata: Metadata = {
  title: 'Community Mind Maps',
  description: 'Explore, search, and learn from thousands of public AI-powered mind maps created by the MindScape community. Discover new insights and visual structures.',
  openGraph: {
    title: 'MindScape Community Hub',
    description: 'Explore the collective knowledge of the MindScape community.',
    images: ['/MindScape-Logo.png'],
  },
};

export default function Page() {
  return <CommunityPage />;
}
