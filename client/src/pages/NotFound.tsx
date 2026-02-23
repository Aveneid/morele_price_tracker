import { useLocation } from "wouter";

const AlertCircle = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 64, height: 64, color: '#dc2626'}}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const Home = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 16, height: 16, marginRight: 8}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div style={{minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)'}}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      <div style={{width: '100%', maxWidth: '32rem', margin: '0 1rem', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '2rem', textAlign: 'center'}}>
        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1.5rem'}}>
          <div style={{position: 'relative'}}>
            <div style={{position: 'absolute', inset: 0, backgroundColor: '#fee2e2', borderRadius: '50%', animation: 'pulse 2s infinite'}} />
            <div style={{position: 'relative'}}>
              <AlertCircle />
            </div>
          </div>
        </div>

        <h1 style={{fontSize: '2.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '0.5rem'}}>404</h1>

        <h2 style={{fontSize: '1.25rem', fontWeight: 600, color: '#334155', marginBottom: '1rem'}}>
          Page Not Found
        </h2>

        <p style={{color: '#475569', marginBottom: '2rem', lineHeight: 1.6}}>
          Sorry, the page you are looking for doesn't exist.
          <br />
          It may have been moved or deleted.
        </p>

        <button onClick={() => setLocation("/")} style={{backgroundColor: '#2563eb', color: 'white', padding: '0.625rem 1.5rem', borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}}>
          <Home />
          Go Home
        </button>
      </div>
    </div>
  );
}
