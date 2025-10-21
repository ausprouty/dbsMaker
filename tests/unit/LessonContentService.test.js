import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLessonContent } from "src/services/LessonContentService";
import { getContentWithFallback } from "src/services/ContentLoaderService";
import { useContentStore } from "stores/ContentStore";

const mockSetLessonContent = vi.fn();
const mockGetLessonContent = vi.fn();

vi.mock("stores/ContentStore", () => ({
  useContentStore: vi.fn(() => ({
    getLessonContent: mockGetLessonContent,
    setLessonContent: mockSetLessonContent,
  })),
}));

vi.mock("src/services/ContentLoaderService", () => ({
  getContentWithFallback: vi.fn(),
}));

vi.mock("src/services/IndexedDBService", () => ({
  getLessonContentFromDB: vi.fn(() => ({ content: "DB fallback content" })),
  saveLessonContentToDB: vi.fn(),
}));

vi.mock("src/utils/ContentKeyBuilder", () => ({
  buildLessonContentKey: vi.fn(() => "lessonContent-key"),
}));

describe("getLessonContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores the lesson content and returns it", async () => {
    // ✅ Ensure storeSetter is used in the mock
    getContentWithFallback.mockImplementation(async (options) => {
      options.storeSetter(options.store, { content: "Loaded content" });
      return { content: "Loaded content" };
    });

    const result = await getLessonContent("life", "eng00", 529, 1);

    expect(result).toEqual({ content: "Loaded content" });

    expect(mockSetLessonContent).toHaveBeenCalledWith("life", "eng00", 529, 1, {
      content: "Loaded content",
    });
  });
});
