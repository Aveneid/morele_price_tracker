import { useEffect, useState } from "react";

interface ManusDialogProps {
  title?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function ManusDialog({
  title,
  logo,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: ManusDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      onClose?.();
    }
  };

  const isOpen = onOpenChange ? open : internalOpen;

  if (!isOpen) return null;

  return (
    <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50}}>
      <div style={{backgroundColor: '#f8f8f7', borderRadius: 20, width: 400, boxShadow: '0px 4px 11px 0px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(32px)', padding: 0, textAlign: 'center'}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.25rem', paddingTop: '3rem'}}>
          {logo ? (
            <div style={{width: 64, height: 64, backgroundColor: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <img src={logo} alt="Dialog graphic" style={{width: 40, height: 40, borderRadius: 6}} />
            </div>
          ) : null}

          {title ? (
            <h2 style={{fontSize: '1.25rem', fontWeight: 600, color: '#34322d', lineHeight: '26px', letterSpacing: '-0.44px', margin: 0}}>
              {title}
            </h2>
          ) : null}
          <p style={{fontSize: '0.875rem', color: '#858481', lineHeight: '20px', letterSpacing: '-0.154px', margin: 0}}>
            Please login with Manus to continue
          </p>
        </div>

        <div style={{padding: '1.25rem'}}>
          <button onClick={onLogin} style={{width: '100%', height: 40, backgroundColor: '#1a1a19', color: 'white', borderRadius: 10, border: 'none', fontSize: '0.875rem', fontWeight: 500, lineHeight: '20px', letterSpacing: '-0.154px', cursor: 'pointer', transition: 'background-color 0.2s'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a29'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a19'}>
            Login with Manus
          </button>
        </div>

        <button onClick={() => handleOpenChange(false)} style={{position: 'absolute', top: 16, right: 16, backgroundColor: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280'}}>×</button>
      </div>
    </div>
  );
}
