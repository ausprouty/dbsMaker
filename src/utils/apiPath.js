// src/utils/apiPath.js
import { normId } from "src/utils/normalize";

export function buildInterfacePath(app, hl) {
  const a = encodeURIComponent(normId(app));
  const h = encodeURIComponent(normId(hl));
  return `/v2/translate/text/interface/${a}/${h}`;
}
