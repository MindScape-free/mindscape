export type SourceType = 'youtube' | 'website' | 'text';

export function detectInputType(value: string): SourceType {
  const trimmed = value.trim();
  if (!trimmed) return 'text';

  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  const urlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

  if (youtubeRegex.test(trimmed)) return 'youtube';

  if (urlRegex.test(trimmed)) return 'website';

  return 'text';
}
