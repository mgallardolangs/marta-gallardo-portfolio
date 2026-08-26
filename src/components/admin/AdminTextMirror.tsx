import { useAdminStore } from './useAdminStore';

interface Props {
  i18nKey: string;
  fallback: string;
}

export default function AdminTextMirror({ i18nKey, fallback }: Props) {
  const store = useAdminStore();

  return store.initialized ? store.getText(i18nKey) : fallback;
}
