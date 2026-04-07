import { useEffect } from 'react';

function upsertMeta(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

/**
 * Keeps Safari browser chrome aligned with the page header color for immersive role shells.
 */
export function useImmersiveThemeColor(themeColor: string) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    upsertMeta('theme-color', themeColor);
  }, [themeColor]);
}
