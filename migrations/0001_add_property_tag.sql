-- Add the Gemini-generated city/type tag used for quick grouping and search.
ALTER TABLE properties ADD COLUMN property_tag TEXT;

UPDATE properties
SET property_tag = trim(localisation) || ' - ' ||
  CASE
    WHEN lower(type) LIKE '%appartement%' OR lower(type) LIKE '%studio%' THEN 'Appartement'
    WHEN lower(type) LIKE '%maison%' OR lower(type) LIKE '%villa%' THEN 'Maison'
    WHEN lower(type) LIKE '%terrain%' THEN 'Terrain'
    WHEN lower(type) LIKE '%immeuble%' THEN 'Immeuble'
    WHEN lower(type) LIKE '%autre%' THEN 'Autre'
    ELSE upper(substr(trim(type), 1, 1)) || substr(trim(type), 2)
  END
WHERE property_tag IS NULL
  AND trim(coalesce(localisation, '')) <> ''
  AND trim(coalesce(type, '')) <> '';
