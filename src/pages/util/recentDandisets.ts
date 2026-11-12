const RECENT_DANDISETS_KEY = "recentDandisets";
const MAX_RECENT_DANDISETS = 10;

export const getRecentDandisets = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_DANDISETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading recent dandisets:", error);
    return [];
  }
};

export const addRecentDandiset = (dandisetId: string) => {
  try {
    const recent = getRecentDandisets();
    // Remove the dandiset if it's already in the list
    const filtered = recent.filter((id) => id !== dandisetId);
    // Add the dandiset to the front of the list
    const updated = [dandisetId, ...filtered].slice(0, MAX_RECENT_DANDISETS);
    localStorage.setItem(RECENT_DANDISETS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error updating recent dandisets:", error);
    return [];
  }
};
