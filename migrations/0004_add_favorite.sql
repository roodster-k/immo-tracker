ALTER TABLE properties ADD COLUMN favorite INTEGER DEFAULT 0;

UPDATE properties
SET favorite = 0
WHERE favorite IS NULL;
