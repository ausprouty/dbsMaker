// src/debug/patchRouterForLogs.js
export function patchRouterForLogs(router) {
  if (import.meta.env.PROD) return;
  if (router.__dbgPatched) return; // ← prevent re-wrapping on HMR

  router.__dbgPatched = true;

  const origPush = router.push.bind(router);
  const origReplace = router.replace.bind(router);

  router.push = (...args) => {
    // only log when it will actually change something
    const to = args[0];
    const target = router.resolve(to).fullPath;
    const current = router.currentRoute.value.fullPath;
    if (target !== current) {
      console.warn("[router.push]", to);
      console.trace();
    }
    return origPush(...args);
  };

  router.replace = (...args) => {
    const to = args[0];
    const target = router.resolve(to).fullPath;
    const current = router.currentRoute.value.fullPath;
    if (target !== current) {
      console.warn("[router.replace]", to);
      console.trace();
    }
    return origReplace(...args);
  };

  // These guards help you see the actual transitions:
  router.beforeEach((to, from) => {
    if (to.fullPath !== from.fullPath) {
      console.info("[beforeEach]", from.fullPath, "→", to.fullPath);
    }
    return true;
  });
  router.afterEach((to, from) => {
    if (to.fullPath !== from.fullPath) {
      console.info("[afterEach]", from.fullPath, "→", to.fullPath);
    }
  });
}
