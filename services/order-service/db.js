import pkg from "pg";

const { Pool } = pkg;

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "trading_sim",
  password: "mypassword123",
  port: 5432,
});