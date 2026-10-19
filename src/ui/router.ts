import { useEffect, useState } from 'react';

export interface Route {
  name: string;
  params: string[];
  query: URLSearchParams;
}

function parse(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const [name, ...params] = path.split('/').filter(Boolean);
  return { name: name || 'home', params, query: new URLSearchParams(qs ?? '') };
}

export function useRoute(): Route {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const f = () => {
      setR(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}

export function go(path: string) {
  window.location.hash = '#/' + path.replace(/^\//, '');
}

export function back(fallback = 'home') {
  if (window.history.length > 1) window.history.back();
  else go(fallback);
}
