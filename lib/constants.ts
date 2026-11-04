export const TRYOUT_QUESTION_COUNT = 50;
export const TRYOUT_DURATION_MINUTES = 60;
export const TRYOUT_DURATION_SECONDS = TRYOUT_DURATION_MINUTES * 60;
export const TRYOUT_DURATION_MS = TRYOUT_DURATION_SECONDS * 1000;

export const PASSING_SCORE_PERCENT = 60;
export const SOLUTIONS_PAGE_SIZE = 5;

export const OPTION_KEYS = ["A", "B", "C", "D"] as const;
export const SUPPORTED_LANGUAGES = ["id", "en"] as const;
export const QUESTION_KINDS = ["tunggal", "jamak"] as const;
export const QUIZ_MODES = ["belajar", "tryout", "remedial"] as const;
export const APP_ROLES = ["user", "admin"] as const;
export const ATTEMPT_STATUSES = ["in_progress", "completed", "expired"] as const;

export const LANGUAGE_NAMES = {
  id: "Bahasa Indonesia",
  en: "English",
} as const;

