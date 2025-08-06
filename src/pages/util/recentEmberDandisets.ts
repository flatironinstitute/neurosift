const RECENT_EMBER_DANDISETS_KEY = "recentEmberDandisets";
const MAX_RECENT_EMBER_DANDISETS = 10;

export const getRecentEmberDandisets = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_EMBER_DANDISETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading recent EMBER Dandisets:", error);
    return [];
  }
};

export const addRecentEmberDandiset = (dandisetId: string) => {
  try {
    const recent = getRecentEmberDandisets();
    // Remove the dandiset if it's already in the list
    const filtered = recent.filter((id) => id !== dandisetId);
    // Add the dandiset to the front of the list
    const updated = [dandisetId, ...filtered].slice(0, MAX_RECENT_EMBER_DANDISETS);
    localStorage.setItem(RECENT_EMBER_DANDISETS_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error updating recent EMBER Dandisets:", error);
    return [];
  }
};
