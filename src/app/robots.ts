import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/history/', '/holdings/', '/import/', '/api/'],
      },
    ],
    sitemap: 'https://patrimoniofinanceiro.pt/sitemap.xml',
  };
}
