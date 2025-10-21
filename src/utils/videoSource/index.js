import { buildArcLightSource } from "./providers/arclight.js";
import { buildVimeoSource } from "./providers/vimeo.js";
import { buildFileSource } from "./providers/file.js";

export function buildVideoSource(input) {
  if (!input || typeof input !== "object") return buildFileSource({});
  switch (input.provider) {
    case "arclight":
      return buildArcLightSource(input);
    case "vimeo":
      return buildVimeoSource(input);
    default:
      return buildFileSource(input);
  }
}
