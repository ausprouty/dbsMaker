// src/router/safeNav.js
export function safeReplace(router, to) {
  const target = router.resolve(to).fullPath;
  const current = router.currentRoute.value.fullPath;
  if (target === current) return Promise.resolve();
  return router.replace(to);
}
