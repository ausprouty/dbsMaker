// src/constants/Defaults.js

export const DEFAULTS = {
  appVersion: "1.3.1", // 👈
  study: "ctc",
  lesson: "1",
  languageCodeHL: "eng00",
  languageCodeJF: "529",
};

// Note: icons will show up on the IndexPage in the order you put them here

export const studyMenu = [
  { key: "jvideo", title: "Jesus Video", image: "jesus.png", route: "/jvideo", maxLessons: 61 },
  { key: "life", title: "Life Issues", image: "life.png", route: "/series/life", maxLessons: 23 },
  { key: "ctc", title: "Connect to Community", image: "community.png", route: "/series/ctc", maxLessons: 23 },
  { key: "obey", title: "Obey", image: "obey.png", route: "/series/obey", maxLessons: 8 },
  { key: "give", title: "Give", image: "give.png", route: "/series/give", maxLessons: 9 },
  { key: "relate", title: "Relate", image: "relate.png", route: "/series/relate", maxLessons: 9 },
  { key: "serve", title: "Serve", image: "serve.png", route: "/series/serve", maxLessons: 9 },
  { key: "hope", title: "Seven Stories of Hope", image: "hope.png", route: "/series/hope", maxLessons: 7 },
  { key: "share", title: "Share", image: "share.png", route: "/series/share", maxLessons: 9 },
  { key: "trust", title: "Trust", image: "trust.png", route: "/series/trust", maxLessons: 17 },
  { key: "lead", title: "Lead", image: "lead.png", route: "/series/lead", maxLessons: 25 },
  { key: "disciple", title: "Disciple", image: "", route: "/series/disciple", maxLessons: 8 }, // image missing?
];

export const MAX_LESSON_NUMBERS = Object.fromEntries(
  studyMenu.map(({ key, maxLessons }) => [key, maxLessons])
);

