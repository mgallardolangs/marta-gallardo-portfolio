import test from 'node:test';
import assert from 'node:assert/strict';

import { AdminStore } from '../src/components/admin/adminStore.ts';
import { getAdminTranslationArsenalPreviewModel } from '../src/lib/adminTranslationArsenalPreview.ts';

function createLocalizedText(es, en, fr) {
  return { es, en, fr, de: '', it: '', ca: '' };
}

function createI18n() {
  return {
    es: {
      translationPage: {
        arsenal: {
          languagesTitle: 'Idiomas',
          toolsTitle: 'Herramientas',
          skillsTitle: 'Habilidades',
        },
        skillGroups: {
          translation: 'Traducción y localización',
          seo: 'SEO y contenido web',
        },
      },
    },
    en: {
      translationPage: {
        arsenal: {
          languagesTitle: 'Languages',
          toolsTitle: 'Tools',
          skillsTitle: 'Skills',
        },
        skillGroups: {
          translation: 'Translation & localization',
          seo: 'SEO & web content',
        },
      },
    },
    fr: {
      translationPage: {
        arsenal: {
          languagesTitle: 'Langues',
          toolsTitle: 'Outils',
          skillsTitle: 'Compétences',
        },
        skillGroups: {
          translation: 'Traduction & localisation',
          seo: 'SEO et contenu web',
        },
      },
    },
  };
}

function createSiteData() {
  return {
    heroMainPhoto: '',
    galleryCutouts: {},
    videoPlaceholderOrEmbedUrl: '',
    ugcHeaderImage: '',
    instagramScreenshot: '',
    socialLinks: { linkedin: '', instagram: '' },
    nicheBackgrounds: {},
    ugcVideos: {},
    ugcPhotos: {},
    nicheIcons: {},
    aboutPhotos: [],
    brandVideo: '',
    toolLogos: {
      notion: '/images/tools/notion.svg',
    },
    videoStickers: {},
    orbitMedia: [],
    ugcPortfolio: [],
    arsenal: {
      languages: [
        {
          id: 'language-french',
          code: 'fr',
          label: createLocalizedText('Francés', 'French', 'Français'),
          level: createLocalizedText('C2', 'C2', 'C2'),
        },
      ],
      tools: [
        {
          id: 'notion',
          logo: '/images/tools/notion.svg',
          label: createLocalizedText('Notion', 'Notion', 'Notion'),
        },
      ],
      skills: [
        {
          id: 'website-localization',
          group: 'translation',
          label: createLocalizedText('Localización web', 'Website localization', 'Localisation web'),
        },
        {
          id: 'local-seo',
          group: 'seo',
          label: createLocalizedText('SEO local', 'Local SEO', 'SEO local'),
        },
      ],
    },
    person: { name: 'Marta', location: 'Elche', socialProfiles: { linkedin: '', instagram: '' } },
  };
}

test('preview model follows AdminStore collection updates across add/remove/reorder/text/group mutations', () => {
  const store = new AdminStore();
  store.init(createI18n(), createSiteData(), 'fr', '');

  const models = [getAdminTranslationArsenalPreviewModel(store.getSnapshot())];
  const unsubscribe = store.subscribe(() => {
    models.push(getAdminTranslationArsenalPreviewModel(store.getSnapshot()));
  });

  const languageIndex = store.addEditableCollectionItem('languages', {
    label: { es: 'Italiano', en: 'Italian', fr: 'Italien' },
    level: { es: 'B2', en: 'B2', fr: 'B2' },
  });
  store.updateEditableCollectionText('languages', languageIndex, 'label', 'fr', 'Italien courant');

  const skillIndex = store.addEditableCollectionItem('skills', {
    group: 'seo',
    label: { es: 'Calendarios editoriales', en: 'Editorial calendars', fr: 'Calendriers éditoriaux' },
  });
  store.moveEditableCollectionItem('skills', skillIndex, -1);
  store.updateEditableCollectionSkillGroup(skillIndex - 1, 'translation');

  const toolIndex = store.addEditableCollectionItem('tools', {
    label: { es: 'Screaming Frog', en: 'Screaming Frog', fr: 'Screaming Frog' },
    logo: '/images/tools/screaming-frog.svg',
  });

  store.removeEditableCollectionItem('languages', 0);
  unsubscribe();

  const latestModel = models.at(-1);
  assert.ok(models.length >= 7, 'preview model should refresh after each store emission');
  assert.equal(latestModel.titles.languages, 'Langues');
  assert.deepEqual(
    latestModel.languages.map((language) => [language.label, language.level]),
    [['Italien courant', 'B2']],
  );
  assert.equal(latestModel.tools[toolIndex].label, 'Screaming Frog');
  assert.equal(latestModel.tools[toolIndex].logoSrc, '/images/tools/screaming-frog.svg');
  assert.equal(latestModel.skillGroups.translation.at(-1).label, 'Calendriers éditoriaux');
  assert.deepEqual(
    latestModel.skillGroups.seo.map((skill) => skill.label),
    ['SEO local'],
  );
});

test('preview model prefers store image previews for tool logos when available', () => {
  const preview = getAdminTranslationArsenalPreviewModel({
    currentLang: 'en',
    getText(key) {
      return {
        'translationPage.arsenal.languagesTitle': 'Languages',
        'translationPage.arsenal.toolsTitle': 'Tools',
        'translationPage.arsenal.skillsTitle': 'Skills',
        'translationPage.skillGroups.translation': 'Translation & localization',
        'translationPage.skillGroups.seo': 'SEO & web content',
      }[key] ?? '';
    },
    getImageSrc(key) {
      return key === 'toolLogos.research-tool' ? 'data:image/svg+xml;base64,preview-logo' : '';
    },
    getEditableCollection(kind) {
      if (kind === 'tools') {
        return [{
          id: 'research-tool',
          logo: '/images/tools/research-tool.svg',
          label: createLocalizedText('Herramienta', 'Research tool', 'Outil'),
        }];
      }
      return [];
    },
  });

  assert.equal(preview.tools[0].logoSrc, 'data:image/svg+xml;base64,preview-logo');
  assert.equal(preview.tools[0].label, 'Research tool');
});
