-- Add manual Gmail/contact tracking fields.
ALTER TABLE properties ADD COLUMN contact_status TEXT DEFAULT 'pas_contacte';
ALTER TABLE properties ADD COLUMN email_sent_at TEXT;
ALTER TABLE properties ADD COLUMN last_contact_at TEXT;
ALTER TABLE properties ADD COLUMN last_reply_at TEXT;
ALTER TABLE properties ADD COLUMN gmail_thread_id TEXT;

UPDATE properties
SET contact_status = 'pas_contacte'
WHERE contact_status IS NULL OR trim(contact_status) = '';
