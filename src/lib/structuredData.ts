// JSON-LD builders shared by pages. Google reads these to understand who
// writes the articles and which services Marttelier offers, and where.
import { getLocalizedPath, getLocalizedRoute, type Lang } from '../i18n';
import { siteData } from './siteData';

const brandName = 'Marttelier';

const areaServed = [
  { '@type': 'City', name: 'Elche' },
  { '@type': 'AdministrativeArea', name: 'Provincia de Alicante' },
  { '@type': 'Place', name: 'Costa Blanca' },
  { '@type': 'Country', name: 'España' },
];

const author = (site: URL, lang: Lang) => ({
  '@type': 'Person',
  name: siteData.person.name,
  url: new URL(getLocalizedRoute('about', lang), site).toString(),
  sameAs: [siteData.person.socialProfiles.linkedin, siteData.person.socialProfiles.instagram],
});

interface ServiceOptions {
  site: URL;
  lang: Lang;
  path: string;
  description: string;
  serviceType: string[];
}

export function professionalServiceJsonLd({ site, lang, path, description, serviceType }: ServiceOptions) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    // Same name as the Google Business Profile, so Google links both.
    name: brandName,
    alternateName: siteData.person.name,
    url: new URL(path, site).toString(),
    image: new URL(siteData.heroMainPhoto, site).toString(),
    description,
    serviceType,
    // No street address: Marta works from home and serves clients in their area.
    address: { '@type': 'PostalAddress', addressLocality: 'Elche', addressRegion: 'Alicante', addressCountry: 'ES' },
    areaServed,
    availableLanguage: ['es', 'en', 'fr'],
    founder: author(site, lang),
    sameAs: [siteData.person.socialProfiles.linkedin, siteData.person.socialProfiles.instagram],
  };
}

interface ArticleOptions {
  site: URL;
  lang: Lang;
  url: string;
  title: string;
  description: string;
  date: Date;
  image?: string;
  tags: string[];
  blogName: string;
}

export function blogPostingJsonLd({ site, lang, url, title, description, date, image, tags, blogName }: ArticleOptions) {
  const pageUrl = new URL(url, site).toString();
  const blogUrl = new URL(getLocalizedPath('/blog', lang), site).toString();
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      datePublished: date.toISOString().slice(0, 10),
      inLanguage: lang,
      mainEntityOfPage: pageUrl,
      ...(image ? { image: new URL(image, site).toString() } : {}),
      keywords: tags.join(', '),
      author: author(site, lang),
      publisher: {
        '@type': 'Organization',
        name: brandName,
        url: new URL('/', site).toString(),
        logo: new URL('/favicon-192.png', site).toString(),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: brandName, item: new URL(getLocalizedPath('/', lang), site).toString() },
        { '@type': 'ListItem', position: 2, name: blogName, item: blogUrl },
        { '@type': 'ListItem', position: 3, name: title, item: pageUrl },
      ],
    },
  ];
}
