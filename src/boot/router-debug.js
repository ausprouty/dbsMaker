import { patchRouterForLogs } from "src/debug/patchRouterForLogs";

export default ({ router }) => {
  if (import.meta.env.DEV) patchRouterForLogs(router);
};
