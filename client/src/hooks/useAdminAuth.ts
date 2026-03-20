import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export function useAdminAuth() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuthQuery = trpc.admin.checkAuth.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (checkAuthQuery.isLoading) {
      setIsChecking(true);
    } else {
      setIsChecking(false);
      setIsAuthenticated(checkAuthQuery.data?.isAuthenticated ?? false);
    }
  }, [checkAuthQuery.isLoading, checkAuthQuery.data]);

  return {
    isAuthenticated,
    isChecking,
  };
}
