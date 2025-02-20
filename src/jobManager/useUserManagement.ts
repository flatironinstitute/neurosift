import { useState, useCallback } from "react";

// Using same base URL as jobs
// const NSJM_API_BASE_URL = "http://localhost:3000/api";
const NSJM_API_BASE_URL = "https://neurosift-job-manager.vercel.app/api";

export interface User {
  userId: string;
  name: string;
  email: string;
  researchDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewUser {
  name: string;
  email: string;
  researchDescription: string;
}

export const useUserManagement = (adminApiKey: string) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingApiKey, setLoadingApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!adminApiKey) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${NSJM_API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${adminApiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching users: ${response.statusText}`);
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(`Failed to fetch users: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [adminApiKey]);

  const createUser = useCallback(
    async (user: NewUser) => {
      if (!adminApiKey) return null;
      setError(null);

      try {
        const response = await fetch(`${NSJM_API_BASE_URL}/users`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(user),
        });

        if (!response.ok) {
          throw new Error(`Error creating user: ${response.statusText}`);
        }

        const data = await response.json();
        await fetchUsers(); // Refresh user list
        return data.user; // Returns user with apiKey
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(`Failed to create user: ${errorMessage}`);
        return null;
      }
    },
    [adminApiKey, fetchUsers],
  );

  const updateUser = useCallback(
    async (userId: string, updates: Partial<NewUser>) => {
      if (!adminApiKey) return;
      setError(null);

      try {
        const response = await fetch(`${NSJM_API_BASE_URL}/users/${userId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${adminApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error(`Error updating user: ${response.statusText}`);
        }

        await fetchUsers(); // Refresh user list
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(`Failed to update user: ${errorMessage}`);
      }
    },
    [adminApiKey, fetchUsers],
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      if (!adminApiKey) return;
      setError(null);

      try {
        const response = await fetch(`${NSJM_API_BASE_URL}/users/${userId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${adminApiKey}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error deleting user: ${response.statusText}`);
        }

        await fetchUsers(); // Refresh user list
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(`Failed to delete user: ${errorMessage}`);
      }
    },
    [adminApiKey, fetchUsers],
  );

  const getUserApiKey = useCallback(
    async (userId: string) => {
      if (!adminApiKey) return null;
      setLoadingApiKey(true);
      setError(null);

      try {
        const response = await fetch(
          `${NSJM_API_BASE_URL}/users/${userId}/key`,
          {
            headers: {
              Authorization: `Bearer ${adminApiKey}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Error fetching API key: ${response.statusText}`);
        }

        const data = await response.json();
        return data.apiKey;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(`Failed to fetch API key: ${errorMessage}`);
        return null;
      } finally {
        setLoadingApiKey(false);
      }
    },
    [adminApiKey],
  );

  return {
    users,
    loading,
    loadingApiKey,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserApiKey,
  };
};
