const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        name: "restore",
        path: "", // default child of "/"
        component: () => import("pages/RestorePage.vue"),
        meta: { resume: false, hideSeasonalHeader: true }, // don’t store this page as lastGoodPath
      },
      {
        name: "Index",
        path: "/index",
        component: () => import("pages/IndexPage.vue"),
        meta: { appbar: "primary" },
      },
      {
        name: "StaticPageMaster",
        path: "/page/:page([a-z0-9-]+)",
        component: () => import("pages/StaticPageMaster.vue"),
        meta: { hideSeasonalHeader: true },
        alias: ["/content/:page([a-z0-9-]+)"],
      },

      {
        name: "VideoMaster",
        path: "/video/:study/:lesson?/:languageCodeHL?/:languageCodeJF?",
        component: () => import("src/pages/VideoMaster.vue"),
      },

      // Optional: keep your old /jvideo/... URLs working via redirect
      {
        path: "/jvideo/:lesson?/:languageCodeHL?/:languageCodeJF?",
        redirect: (to) => {
          return {
            name: "VideoMaster",
            params: {
              study: "jvideo",
              lesson: to.params.lesson,
              languageCodeHL: to.params.languageCodeHL,
              languageCodeJF: to.params.languageCodeJF,
            },
          };
        },
      },
      {
        name: "SeriesMaster",
        path: "/series/:study?/:lesson?/:languageCodeHL?/:languageCodeJF?",
        component: () => import("pages/SeriesMaster.vue"),
      },
      {
        name: "ExternalPage",
        path: "/external/:raw(.*)*",
        component: () => import("src/pages/ExternalPage.vue"),
        meta: {
          appbar: "primary",
          hideSeasonalHeader: true,
        },
        alias: ["/questions/:raw(.*)*", "/ask/:raw(.*)*"],
      },
      {
        name: "reset",
        path: "/reset",
        meta: { hideSeasonalHeader: true },
        component: () => import("pages/ResetData.vue"),
      },
    ],
  },
  // Always leave this as last one,
  {
    path: "/:catchAll(.*)*",
    redirect: { name: "Index" }, // Index is a child of MainLayout
  },
];

export default routes;
