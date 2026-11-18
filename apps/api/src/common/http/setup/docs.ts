// Swagger at /docs and the GraphQL explorer at /graphql: off in production
// unless SWAGGER=true; SWAGGER=false turns them off everywhere.
export function docsEnabled(): boolean {
  return (
    process.env.SWAGGER === "true" ||
    (process.env.SWAGGER !== "false" && process.env.NODE_ENV !== "production")
  );
}
