import { Metadata, ResolvingMetadata } from 'next';
import { getSupabaseClient } from '@/lib/supabase-db';
import MindMapPage from './CanvasClient';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await searchParams;
  const mapId = (params.mapId || params.publicMapId || params.sharedMapId) as string;
  const topic = params.topic as string;

  if (mapId) {
    const supabase = getSupabaseClient();
    
    // Check public_mindmaps first as they are the ones we want to index
    const { data: map } = await supabase
      .from('public_mindmaps')
      .select('topic')
      .eq('id', mapId)
      .single();

    if (map) {
      const ogUrl = new URL(`${baseUrl}/api/og`);
      ogUrl.searchParams.set('topic', map.topic);

      return {
        title: map.topic,
        description: `Explore the AI-generated mind map for "${map.topic}". MindScape helps you visualize complex information.`,
        openGraph: {
          title: map.topic,
          description: `Interactive AI-powered mind map for ${map.topic}`,
          images: [ogUrl.toString()],
        },
      };
    }
  }

  if (topic) {
    return {
      title: `${topic} - Mind Map`,
      description: `Explore connections and learn about ${topic} with this AI-powered mind map.`,
    };
  }

  return {
    title: 'Mind Map Canvas',
    description: 'Transform your thoughts into structured knowledge with MindScape\'s interactive AI canvas.',
  };
}

export default function Page() {
  return <MindMapPage />;
}
