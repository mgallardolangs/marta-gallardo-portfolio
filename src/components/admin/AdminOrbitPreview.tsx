import type { Lang } from '../../i18n';
import OvalMediaOrbit from '../OvalMediaOrbit';
import { useAdminStore } from './useAdminStore';

interface Props {
  lang: Lang;
}

export default function AdminOrbitPreview({ lang }: Props) {
  const store = useAdminStore();

  return (
    <OvalMediaOrbit
      items={store.getOrbitMedia()}
      lang={lang}
      previewMode={true}
      ariaLabel="Orbit preview"
    />
  );
}
