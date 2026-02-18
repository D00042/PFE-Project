const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "pfe_project",
  password: "mimi2004",
  port: 5432,
});

module.exports = pool;