// Path every route is mounted under (API_PREFIX, e.g. "/api"; "" at the
// root). GET / stays unprefixed for the healthcheck.
export const API_PREFIX = (process.env.API_PREFIX ?? "")
  .replace(/^\/*/, "/")
  .replace(/\/+$/, "");
