import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export function useAdminAuth() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminId, setAdminId] = useState<number | null>(null);

  const checkAuthQuery = trpc.admin.checkAuth.useQuery(undefined, {
    retry: 1,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes to keep session fresh
  });

  useEffect(() => {
    if (checkAuthQuery.status === "pending") {
      setIsChecking(true);
    } else if (checkAuthQuery.status === "success") {
      setIsChecking(false);
      setIsAuthenticated(checkAuthQuery.data?.isAuthenticated ?? false);
      setAdminId(checkAuthQuery.data?.adminId ?? null);
    } else if (checkAuthQuery.status === "error") {
      setIsChecking(false);
      setIsAuthenticated(false);
      setAdminId(null);
    }
  }, [checkAuthQuery.status, checkAuthQuery.data]);

  return {
    isAuthenticated,
    isChecking,
    adminId,
  };
}
