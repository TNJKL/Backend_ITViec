export const JOB_TAGS = ['New', 'Hot', 'Super Hot'] as const;
export type JobTag = (typeof JOB_TAGS)[number];

export const normalizeJobTag = (tag?: string | null) =>
  tag ? tag.trim().toLowerCase() : null;


