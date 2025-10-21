import { route } from 'quasar/wrappers';
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory
} from 'vue-router';
import routes from './routes';
import { syncLanguageFromRoute } from 'src/i18n/syncLanguageFromRoute';
import siteMeta from '@site/meta.json';

function setMetaTag(kind, key, content) {
  if (typeof window === 'undefined') return;
  const sel = kind === 'property' ? `meta[property="${key}"]` : `meta[name="${key}"]`;
  let el = document.head.querySelector(sel);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(kind, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default route(function () {
  const isServer = typeof window === 'undefined';


  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history'
        ? createWebHistory
        : createWebHashHistory);

  const Router = createRouter({
    routes,
    scrollBehavior: () => ({ left: 0, top: 0 }),
    history: createHistory(process.env.VUE_ROUTER_BASE)
  });

  Router.beforeEach((to, from, next) => {
    syncLanguageFromRoute(to);
    next();
  });

  if (!isServer) {
    const baseTitle = siteMeta?.title || siteMeta?.pwa?.name || 'App';
    const baseDesc  = siteMeta?.description || siteMeta?.pwa?.description || '';

    document.title = baseTitle;
    setMetaTag('name', 'description', baseDesc);
    setMetaTag('property', 'og:title', baseTitle);
    setMetaTag('property', 'og:description', baseDesc);
    setMetaTag('property', 'og:type', 'website');

    Router.afterEach((to) => {
      const pageTitle = to?.meta?.title;
      document.title = pageTitle ? `${pageTitle} • ${baseTitle}` : baseTitle;
    });
  }

  return Router;
});
