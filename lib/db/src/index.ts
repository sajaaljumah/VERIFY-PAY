import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { getDatabaseConnectionOptions } from "./connection";

const { Pool } = pg;

export const pool = new Pool(getDatabaseConnectionOptions());
export const db = drizzle(pool, { schema });

export * from "./schema";
