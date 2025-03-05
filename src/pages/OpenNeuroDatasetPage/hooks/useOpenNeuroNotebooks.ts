import { useState, useEffect } from "react";

const ANNOTATION_API_BASE_URL =
  "https://neurosift-annotation-manager.vercel.app/api";

interface NotebookUrls {
  [datasetId: string]: string[];
}

export const useOpenNeuroNotebooks = () => {
  const [notebookUrls, setNotebookUrls] = useState<NotebookUrls>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotebooks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all openneuro dataset notebook annotations
        const response = await fetch(
          `${ANNOTATION_API_BASE_URL}/annotations?targetType=openneuro_dataset&type=note&tags=notebook`,
          {
            headers: {
              ...(localStorage.getItem("neurosiftApiKey")
                ? {
                    Authorization: `Bearer ${localStorage.getItem(
                      "neurosiftApiKey",
                    )}`,
                  }
                : {}),
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch notebook annotations");
        }

        const data = await response.json();
        const notebooksMap: NotebookUrls = {};

        // Group notebook URLs by dataset ID
        data.annotations.forEach((annotation: any) => {
          const datasetTag = annotation.tags.find((tag: string) =>
            tag.startsWith("openneuro:"),
          );
          if (datasetTag) {
            const datasetId = datasetTag.split(":")[1];
            const firstLine = annotation.data.content.split("\n")[0].trim();
            if (firstLine.startsWith("http")) {
              if (!notebooksMap[datasetId]) {
                notebooksMap[datasetId] = [];
              }
              notebooksMap[datasetId].push(firstLine);
            }
          }
        });

        setNotebookUrls(notebooksMap);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch notebook annotations",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotebooks();
  }, []);

  return { notebookUrls, isLoading, error };
};
