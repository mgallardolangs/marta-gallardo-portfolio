export const EXPERIENCE_TAB_IDS = ['education', 'experience'] as const;
export type ExperienceTabId = (typeof EXPERIENCE_TAB_IDS)[number];

export function getNextExperienceTabIndex(activeIndex: number, key: string) {
  const itemCount = EXPERIENCE_TAB_IDS.length;

  if (key === 'ArrowRight') {
    return (activeIndex + 1) % itemCount;
  }
  if (key === 'ArrowLeft') {
    return (activeIndex - 1 + itemCount) % itemCount;
  }
  if (key === 'Home') return 0;
  if (key === 'End') return itemCount - 1;
  return activeIndex;
}
