import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLessonContent } from "src/services/LessonContentService";
import { useContentStore } from "stores/ContentStore";

describe("getLessonContent integration", () => {
  let store;

  beforeEach(() => {
    vi.resetModules(); // clear cache
    store = useContentStore();
    store.clearAllContent(); // reset store state
  });

  it("loads lesson content and stores it", async () => {
    const study = "life";
    const hl = "eng00";
    const jf = 529;
    const lesson = 1;

    const result = await getLessonContent(study, hl, jf, lesson);

    // See what was returned
    console.log("This may be returned result or it may be undefined:", result);

    // See what was stored
    const stored = store.getLessonContent(study, hl, jf, lesson);
    console.log("Stored in Pinia:", stored);

    expect(stored).toEqual(result);
    expect(stored).toHaveProperty("content");
  });
});
