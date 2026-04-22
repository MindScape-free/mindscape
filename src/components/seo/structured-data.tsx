import React from 'react';

interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'SoftwareApplication';
  data: any;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mindscape-free.vercel.app';

  let schema: any = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data,
  };

  if (type === 'Organization') {
    schema = {
      ...schema,
      name: 'MindScape',
      url: baseUrl,
      logo: `${baseUrl}/MindScape-Logo.png`,
      sameAs: [
        'https://twitter.com/mindscape',
        'https://github.com/mindscape',
      ],
    };
  }

  if (type === 'WebSite') {
    schema = {
      ...schema,
      name: 'MindScape',
      url: baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/canvas?topic={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };
  }

  if (type === 'SoftwareApplication') {
    schema = {
      ...schema,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1024',
      },
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
