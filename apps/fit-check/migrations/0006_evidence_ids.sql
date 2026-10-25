-- An answer can name several places Ryan used a skill. evidence_ids is a JSON array that replaces evidence_id (and, in
-- skill_responses, evidence_kind): record ids from apps/fit-check/src/record.json, plus "testimonial" and "self_taught"
-- in skill_responses. The old columns stay until the next migration so the Worker running during a deploy keeps working;
-- nothing reads or writes them after this one.
ALTER TABLE skill_responses ADD COLUMN evidence_ids TEXT NOT NULL DEFAULT '[]';
UPDATE skill_responses SET evidence_ids = json_array(evidence_id) WHERE evidence_id IS NOT NULL;
UPDATE skill_responses SET evidence_ids = json_array(evidence_kind) WHERE evidence_id IS NULL AND evidence_kind IN ('testimonial', 'self_taught');

ALTER TABLE skill_answers ADD COLUMN evidence_ids TEXT NOT NULL DEFAULT '[]';
UPDATE skill_answers SET evidence_ids = json_array(evidence_id) WHERE evidence_id IS NOT NULL;
