-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  backend_name TEXT NOT NULL,
  ts TIMESTAMP DEFAULT NOW(),
  meta JSONB,
  image BYTEA
);

-- Create index on backend_name for faster queries
CREATE INDEX IF NOT EXISTS idx_backend_name ON requests(backend_name);

-- Create index on timestamp for faster sorting
CREATE INDEX IF NOT EXISTS idx_ts ON requests(ts DESC);
