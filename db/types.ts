// Loosely typed on purpose: real code uses the Neon-backed db (db/index.ts), tests use an
// in-memory pglite db (__tests__/db/test-db.ts) -- both are drizzle instances over the same
// schema, but their driver-specific generic types don't unify cleanly.
export type AppDb = any;
