import { useState, useCallback, useEffect } from "react";
import { useUserInfoCache } from "../DandisetPage/hooks/useUserInfoCache";

const ANNOTATION_API_BASE_URL =
  "https://neurosift-annotation-manager.vercel.app/api";
const NSJM_API_BASE_URL = "https://neurosift-job-manager.vercel.app/api";

export interface Annotation {
  id: string;
  title: string;
  type: string;
  userId: string;
  userName?: string;
  targetType: string;
  data: {
    content: string;
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface AnnotationUpdate {
  title?: string;
  content?: string;
  tags?: string[];
}

export const useResourceAnnotations = (
  targetType: string | undefined,
  tags: string[],
) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getUserInfo } = useUserInfoCache();

  // important: we stringify the tags to avoid unnecessary re-renders
  const tagsStringified = JSON.stringify(tags);

  const fetchAnnotations = useCallback(async () => {
    const tagsUnstringified: string[] = JSON.parse(tagsStringified);
    setIsLoading(true);
    setError(null);
    try {
      const tagsQueryParam = tagsUnstringified
        .map((tag) => `tags=${tag}`)
        .join("&");
      let q = `${tagsQueryParam}`;
      if (targetType) {
        q += `&targetType=${targetType}`;
      }
      q += `&type=note`;
      const response = await fetch(
        `${ANNOTATION_API_BASE_URL}/annotations?${q}`,
        {
          headers: {
            ...(localStorage.getItem("neurosiftApiKey")
              ? {
                  Authorization: `Bearer ${localStorage.getItem("neurosiftApiKey")}`,
                }
              : {}),
          },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch annotations");
      }
      const data = await response.json();
      const annotationsList: Annotation[] = data.annotations;
      for (const annotation of annotationsList) {
        const info = await getUserInfo(annotation.userId);
        annotation.userName = info?.name || annotation.userId;
      }
      setAnnotations(annotationsList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch annotations",
      );
    } finally {
      setIsLoading(false);
    }
  }, [targetType, tagsStringified, getUserInfo]);

  const createAnnotation = useCallback(
    async (title: string, content: string) => {
      const tagsUnstringified: string[] = JSON.parse(tagsStringified);
      try {
        const response = await fetch(`${ANNOTATION_API_BASE_URL}/annotations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("neurosiftApiKey")
              ? {
                  Authorization: `Bearer ${localStorage.getItem("neurosiftApiKey")}`,
                }
              : {}),
          },
          body: JSON.stringify({
            title,
            type: "note",
            targetType,
            tags: tagsUnstringified,
            data: { content },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create annotation");
        }

        // Refresh annotations after creating new one
        await fetchAnnotations();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create annotation",
        );
        return false;
      }
    },
    [targetType, tagsStringified, fetchAnnotations],
  );

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const getCurrentUserId = useCallback(async (): Promise<
    string | undefined
  > => {
    const apiKey = localStorage.getItem("neurosiftApiKey");
    if (!apiKey) return undefined;

    try {
      const response = await fetch(`${NSJM_API_BASE_URL}/users/by-api-key`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to get current user");
      }

      const data = await response.json();
      return data.userId;
    } catch (err) {
      console.error("Error getting current user:", err);
      return undefined;
    }
  }, []);

  const deleteAnnotation = useCallback(
    async (id: string): Promise<boolean> => {
      const apiKey = localStorage.getItem("neurosiftApiKey");
      if (!apiKey) return false;

      try {
        const response = await fetch(
          `${ANNOTATION_API_BASE_URL}/annotations?id=${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to delete annotation");
        }

        await fetchAnnotations();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete annotation",
        );
        return false;
      }
    },
    [fetchAnnotations],
  );

  const updateAnnotation = useCallback(
    async (id: string, updates: AnnotationUpdate): Promise<boolean> => {
      const apiKey = localStorage.getItem("neurosiftApiKey");
      if (!apiKey) return false;

      try {
        const response = await fetch(`${ANNOTATION_API_BASE_URL}/annotations`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            id,
            data: updates.content ? { content: updates.content } : undefined,
            ...(updates.title ? { title: updates.title } : {}),
            ...(updates.tags ? { tags: updates.tags } : {}),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update annotation");
        }

        await fetchAnnotations();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update annotation",
        );
        return false;
      }
    },
    [fetchAnnotations],
  );

  return {
    annotations,
    isLoading,
    error,
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    getCurrentUserId,
    refreshAnnotations: fetchAnnotations,
  };
};
