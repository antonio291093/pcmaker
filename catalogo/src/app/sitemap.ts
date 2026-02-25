import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {

  return [
    {
      url: 'https://catalogo.pcmaker.mx',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

}