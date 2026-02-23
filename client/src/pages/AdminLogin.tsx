import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const AlertCircle = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const Loader = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8, animation: 'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>;

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: () => {
      showToast("Login successful!", "success");
      navigate("/admin");
    },
    onError: (err) => {
      setError(err.message || "Login failed");
      showToast("Login failed", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }

    loginMutation.mutate({ username, password });
  };

  return (
    <div style={{minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'}}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Toasts */}
      <div style={{position: 'fixed', bottom: 20, right: 20, zIndex: 9999}}>
        {toasts.map(t => (
          <div key={t.id} style={{backgroundColor: t.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: 16, borderRadius: 8, marginBottom: 12}}>
            {t.message}
          </div>
        ))}
      </div>

      <div style={{width: '100%', maxWidth: '28rem', backgroundColor: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
        <div style={{padding: '2rem', borderBottom: '1px solid #e5e7eb'}}>
          <h1 style={{textAlign: 'center', fontSize: '1.875rem', fontWeight: 600, margin: 0}}>Admin Login</h1>
        </div>
        <div style={{padding: '2rem'}}>
          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {error && (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, color: '#b91c1c', fontSize: '0.875rem'}}>
                <AlertCircle />
                {error}
              </div>
            )}

            <div>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem'}}>
                Username
              </label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" disabled={loginMutation.isPending} autoFocus style={{width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', opacity: loginMutation.isPending ? 0.6 : 1}} />
            </div>

            <div>
              <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem'}}>
                Password
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" disabled={loginMutation.isPending} style={{width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem', opacity: loginMutation.isPending ? 0.6 : 1}} />
            </div>

            <button type="submit" disabled={loginMutation.isPending} style={{width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '0.5rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loginMutation.isPending ? 0.7 : 1}}>
              {loginMutation.isPending ? (
                <>
                  <Loader />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
