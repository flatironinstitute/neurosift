import { useState, useCallback } from "react";

const NSJM_API_BASE_URL = "https://neurosift-job-manager.vercel.app/api";

interface UserInfo {
  name: string;
}

const userInfoCache = new Map<string, UserInfo>();

export const useUserInfoCache = () => {
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  const getUserInfo = useCallback(
    async (userId: string): Promise<UserInfo | undefined> => {
      // Return from cache if available
      if (userInfoCache.has(userId)) {
        return userInfoCache.get(userId);
      }

      setIsLoading((prev) => ({ ...prev, [userId]: true }));
      try {
        const response = await fetch(
          `${NSJM_API_BASE_URL}/users/${userId}/basic-info`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch user info");
        }
        const data = await response.json();
        const userInfo: UserInfo = { name: data.name };

        // Update cache
        userInfoCache.set(userId, userInfo);
        return userInfo;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch user info",
        );
        return undefined;
      } finally {
        setIsLoading((prev) => {
          const newLoading = { ...prev };
          delete newLoading[userId];
          return newLoading;
        });
      }
    },
    [],
  );

  const isUserLoading = useCallback(
    (userId: string) => {
      return Boolean(isLoading[userId]);
    },
    [isLoading],
  );

  return {
    getUserInfo,
    isUserLoading,
    error,
  };
};
