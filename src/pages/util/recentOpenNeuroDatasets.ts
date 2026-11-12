const RECENT_OPENNEURO_DATASETS_KEY = "recentOpenNeuroDatasets";
const MAX_RECENT_DATASETS = 10;

export const getRecentOpenNeuroDatasets = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_OPENNEURO_DATASETS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading recent OpenNeuro datasets:", error);
    return [];
  }
};

export const addRecentOpenNeuroDataset = (datasetId: string) => {
  try {
    const recent = getRecentOpenNeuroDatasets();
    // Remove the dataset if it's already in the list
    const filtered = recent.filter((id) => id !== datasetId);
    // Add the dataset to the front of the list
    const updated = [datasetId, ...filtered].slice(0, MAX_RECENT_DATASETS);
    localStorage.setItem(
      RECENT_OPENNEURO_DATASETS_KEY,
      JSON.stringify(updated),
    );
    return updated;
  } catch (error) {
    console.error("Error updating recent OpenNeuro datasets:", error);
    return [];
  }
};
