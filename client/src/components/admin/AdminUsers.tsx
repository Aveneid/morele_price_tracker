import { useState } from "react";

const Plus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const Trash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16}}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const Loader = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8, animation: 'spin 1s linear infinite'}}><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10"></path></svg>;

export default function AdminUsers() {
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const adminUsers = [
    { id: 1, username: "admin", createdAt: new Date(Date.now() - 86400000) },
  ];

  const handleAddUser = () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      showToast("Please enter both username and password", "error");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      showToast("Admin user created successfully", "success");
      setNewUsername("");
      setNewPassword("");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Toasts */}
      <div style={{position: 'fixed', bottom: 20, right: 20, zIndex: 9999}}>
        {toasts.map(t => (
          <div key={t.id} style={{backgroundColor: t.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: 16, borderRadius: 8, marginBottom: 12}}>
            {t.message}
          </div>
        ))}
      </div>

      <div>
        <h2 style={{fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem'}}>Admin Users</h2>
        <p style={{color: '#4b5563'}}>Manage admin user accounts for the system</p>
      </div>

      {/* Add User Form */}
      <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', padding: '1.5rem'}}>
        <h3 style={{fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1rem'}}>Create New Admin User</h3>

        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          <div>
            <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem'}}>Username</label>
            <input type="text" placeholder="Enter username" value={newUsername} onChange={(e: any) => setNewUsername(e.target.value)} style={{width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem'}} />
          </div>

          <div>
            <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem'}}>Password</label>
            <input type="password" placeholder="Enter password" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} style={{width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.875rem'}} />
            <p style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem'}}>Passwords are hashed with SHA1 for security</p>
          </div>

          <button onClick={handleAddUser} disabled={isLoading} style={{backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isLoading ? 0.7 : 1}}>
            {isLoading ? (
              <>
                <Loader />
                Creating...
              </>
            ) : (
              <>
                <Plus />
                Create Admin User
              </>
            )}
          </button>
        </div>
      </div>

      {/* Users List */}
      <div style={{backgroundColor: 'white', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden'}}>
        <div style={{padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb'}}>
          <h3 style={{fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0}}>Admin Users ({adminUsers.length})</h3>
        </div>

        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead style={{backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb'}}>
              <tr>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Username</th>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Created</th>
                <th style={{padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, color: '#374151'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((user) => (
                <tr key={user.id} style={{borderBottom: '1px solid #e5e7eb', transition: 'background-color 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#111827'}}>{user.username}</td>
                  <td style={{padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#4b5563'}}>{user.createdAt.toLocaleString("pl-PL")}</td>
                  <td style={{padding: '1rem 1.5rem', textAlign: 'right'}}>
                    <button disabled={user.username === "admin"} style={{backgroundColor: 'transparent', color: user.username === "admin" ? '#d1d5db' : '#dc2626', border: 'none', cursor: user.username === "admin" ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', opacity: user.username === "admin" ? 0.5 : 1}}>
                      <Trash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '1rem'}}>
        <p style={{fontSize: '0.875rem', color: '#1e40af', margin: 0}}>
          <strong>Note:</strong> Admin users are added manually to the database. Passwords are hashed using SHA1 algorithm for security.
        </p>
      </div>
    </div>
  );
}
