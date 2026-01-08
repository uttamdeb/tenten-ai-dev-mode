import { GitEndpoint } from "@/components/SettingsPanel";

export interface ThreadOption {
  id: number;
  label: string;
  subject: string;
}

// Thread ID mappings for different environments
export const THREAD_MAPPINGS = {
  prod: [
    { id: 1, label: "Physics", subject: "physics" },
    { id: 2, label: "Chemistry", subject: "chemistry" },
    { id: 4, label: "Biology", subject: "biology" },
    { id: 3, label: "Math", subject: "mathematics" },
    { id: 69, label: "Science", subject: "science" },
    { id: 35, label: "English", subject: "english" },
    { id: 68, label: "Higher Math", subject: "higher-math" },
    { id: 67, label: "ICT", subject: "ict" },
    { id: 34, label: "Bangla", subject: "bangla" }
  ],
  stage: [
    { id: 3, label: "ICT", subject: "ict" },
    { id: 4, label: "Biology", subject: "biology" },
    { id: 2, label: "Chemistry", subject: "chemistry" },
    { id: 5, label: "Bangla", subject: "bangla" },
    { id: 7, label: "Physics", subject: "physics" },
    { id: 6, label: "English", subject: "english" },
    { id: 1, label: "Math", subject: "mathematics" },
    { id: 8, label: "Science", subject: "science" },
    { id: 9, label: "Higher Math", subject: "higher-math" }
  ],
  local: [
    { id: 3, label: "ICT", subject: "ict" },
    { id: 4, label: "Biology", subject: "biology" },
    { id: 2, label: "Chemistry", subject: "chemistry" },
    { id: 5, label: "Bangla", subject: "bangla" },
    { id: 7, label: "Physics", subject: "physics" },
    { id: 6, label: "English", subject: "english" },
    { id: 1, label: "Math", subject: "mathematics" },
    { id: 8, label: "Science", subject: "science" },
    { id: 9, label: "Higher Math", subject: "higher-math" }
  ]
};

/**
 * Get thread options for a specific environment
 */
export function getThreadOptions(endpoint: GitEndpoint): ThreadOption[] {
  return THREAD_MAPPINGS[endpoint];
}

/**
 * Get subject name from thread ID for a specific environment
 */
export function getSubjectFromThreadId(threadId: number | null, endpoint: GitEndpoint): string | null {
  if (threadId === null) return null;
  const mapping = THREAD_MAPPINGS[endpoint].find(m => m.id === threadId);
  return mapping?.subject || null;
}

/**
 * Get thread ID from subject for a specific environment
 */
export function getThreadIdFromSubject(subject: string, endpoint: GitEndpoint): number | null {
  const mapping = THREAD_MAPPINGS[endpoint].find(m => m.subject === subject);
  return mapping?.id || null;
}

/**
 * Get label from thread ID for a specific environment
 */
export function getLabelFromThreadId(threadId: number | null, endpoint: GitEndpoint): string | null {
  if (threadId === null) return null;
  const mapping = THREAD_MAPPINGS[endpoint].find(m => m.id === threadId);
  return mapping?.label || null;
}
