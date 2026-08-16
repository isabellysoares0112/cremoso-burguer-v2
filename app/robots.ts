import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/equipe', '/equipe/*', '/api/'],
      },
    ],
    sitemap: 'https://cremosoburguer.netlify.app/sitemap.xml',
  }
}