import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getSessionExpirationDays } from "@/../../shared/config";
import { setAdminSessionToken } from "@/lib/adminSessionStorage";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: async (data: any) => {
      toast.success("Login successful!");
      console.log("[AdminLogin] Login successful, storing session token...");
      
      // Store the session token returned from server
      if (data.token) {
        setAdminSessionToken(data.token);
        console.log("[AdminLogin] Session token stored");
      }
      
      // Invalidate the auth check query to force a refresh
      await utils.admin.checkAuth.invalidate();
      console.log("[AdminLogin] Auth cache invalidated");
      
      // Small delay to ensure token is stored and will be sent with next request
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refetch auth to verify session is valid
      const authResult = await utils.admin.checkAuth.fetch();
      console.log("[AdminLogin] Auth check result:", authResult);
      
      if (authResult.isAuthenticated) {
        console.log("[AdminLogin] Authenticated! Navigating to admin panel");
        navigate("/admin");
      } else {
        console.log("[AdminLogin] Auth check failed, retrying...");
        // Retry once more after a delay
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryResult = await utils.admin.checkAuth.fetch();
        console.log("[AdminLogin] Retry auth check result:", retryResult);
        
        if (retryResult.isAuthenticated) {
          navigate("/admin");
        } else {
          setError("Session validation failed. Please try again.");
          toast.error("Session validation failed");
        }
      }
    },
    onError: (err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      console.error("[AdminLogin] Login error:", errorMessage);
      setError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    console.log("[AdminLogin] Attempting login with username:", username);
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loginMutation.isPending}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loginMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Session expires in {getSessionExpirationDays()} days
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
