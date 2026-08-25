import { useSyncExternalStore } from 'react';
import { adminStore } from './adminStore';

export function useAdminStore() {
  const state = useSyncExternalStore(
    (cb) => adminStore.subscribe(cb),
    () => adminStore.getSnapshot(),
    () => adminStore.getSnapshot(),
  );

  return {
    ...state,
    setText: adminStore.setText.bind(adminStore),
    setImage: adminStore.setImage.bind(adminStore),
    setOrbitMediaFile: adminStore.setOrbitMediaFile.bind(adminStore),
    getUgcPortfolio: adminStore.getUgcPortfolio.bind(adminStore),
    updateUgcPortfolioField: adminStore.updateUgcPortfolioField.bind(adminStore),
    setUgcPortfolioMedia: adminStore.setUgcPortfolioMedia.bind(adminStore),
    setUgcPortfolioPoster: adminStore.setUgcPortfolioPoster.bind(adminStore),
    clearUgcPortfolioPoster: adminStore.clearUgcPortfolioPoster.bind(adminStore),
    addOrbitMediaItem: adminStore.addOrbitMediaItem.bind(adminStore),
    removeOrbitMediaItem: adminStore.removeOrbitMediaItem.bind(adminStore),
    moveOrbitMediaItem: adminStore.moveOrbitMediaItem.bind(adminStore),
    updateOrbitMediaType: adminStore.updateOrbitMediaType.bind(adminStore),
    updateOrbitMediaHref: adminStore.updateOrbitMediaHref.bind(adminStore),
    updateOrbitMediaPoster: adminStore.updateOrbitMediaPoster.bind(adminStore),
    updateOrbitMediaText: adminStore.updateOrbitMediaText.bind(adminStore),
    getEditableCollection: adminStore.getEditableCollection.bind(adminStore),
    addEditableCollectionItem: adminStore.addEditableCollectionItem.bind(adminStore),
    removeEditableCollectionItem: adminStore.removeEditableCollectionItem.bind(adminStore),
    moveEditableCollectionItem: adminStore.moveEditableCollectionItem.bind(adminStore),
    updateEditableCollectionText: adminStore.updateEditableCollectionText.bind(adminStore),
    updateEditableCollectionSkillGroup: adminStore.updateEditableCollectionSkillGroup.bind(adminStore),
    setEditableToolLogo: adminStore.setEditableToolLogo.bind(adminStore),
    getPublicLanguagePicker: adminStore.getPublicLanguagePicker.bind(adminStore),
    setPublicLanguageVisibility: adminStore.setPublicLanguageVisibility.bind(adminStore),
    setLang: adminStore.setLang.bind(adminStore),
    publish: adminStore.publish.bind(adminStore),
    saveDraft: adminStore.saveDraft.bind(adminStore),
    loadDraft: adminStore.loadDraft.bind(adminStore),
    createBlogPost: adminStore.createBlogPost.bind(adminStore),
  };
}
