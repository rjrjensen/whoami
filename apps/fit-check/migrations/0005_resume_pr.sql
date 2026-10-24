-- The admin app's resume.yaml bridge (apps/admin/src/lib/server/resume-pr.ts): the pull request an answer went into.
-- resume_status stays 'todo' while the PR is open, turns 'done' when it merges, and the number clears if it's closed unmerged.
ALTER TABLE skill_responses ADD COLUMN resume_pr INTEGER;
