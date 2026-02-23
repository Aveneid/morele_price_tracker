import React from 'react';

// ============ TOAST NOTIFICATIONS ============
export const Toast = ({ type, message, onClose }: { type: 'success' | 'error' | 'info' | 'warning'; message: string; onClose: () => void }) => {
  const bgColor = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' }[type];
  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: bgColor, color: 'white', padding: '16px', borderRadius: '8px', zIndex: 9999 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{message}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '12px' }}>✕</button>
      </div>
    </div>
  );
};

// ============ BUTTONS ============
export const Button = ({ children, onClick, disabled, variant = 'primary', ...props }: any) => {
  const styles: Record<string, any> = {
    primary: { background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' },
    secondary: { background: '#e5e7eb', color: '#1f2937', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' },
    danger: { background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...(styles[variant] || styles.primary), opacity: disabled ? 0.5 : 1 }} {...props}>{children}</button>;
};

// ============ INPUT FIELDS ============
export const Input = ({ label, type = 'text', value, onChange, placeholder, error, ...props }: any) => (
  <div style={{ marginBottom: '16px' }}>
    {label && <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width: '100%', padding: '8px', border: error ? '2px solid #ef4444' : '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} {...props} />
    {error && <span style={{ color: '#ef4444', fontSize: '12px' }}>{error}</span>}
  </div>
);

// ============ SELECT DROPDOWN ============
export const Select = ({ label, value, onChange, options, error, ...props }: any) => (
  <div style={{ marginBottom: '16px' }}>
    {label && <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>{label}</label>}
    <select value={value} onChange={onChange} style={{ width: '100%', padding: '8px', border: error ? '2px solid #ef4444' : '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} {...props}>
      <option value="">Select...</option>
      {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    {error && <span style={{ color: '#ef4444', fontSize: '12px' }}>{error}</span>}
  </div>
);

// ============ CHECKBOX ============
export const Checkbox = ({ label, checked, onChange, ...props }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ marginRight: '8px', cursor: 'pointer' }} {...props} />
    {label && <label style={{ cursor: 'pointer' }}>{label}</label>}
  </div>
);

// ============ MODAL/DIALOG ============
export const Modal = ({ isOpen, title, children, onClose, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel' }: any) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginBottom: '24px' }}>{children}</div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
          {onConfirm && <Button onClick={onConfirm}>{confirmText}</Button>}
        </div>
      </div>
    </div>
  );
};

// ============ CARD ============
export const Card = ({ title, children, ...props }: any) => (
  <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }} {...props}>
    {title && <h3 style={{ margin: '0 0 12px 0' }}>{title}</h3>}
    {children}
  </div>
);

// ============ TABLE ============
export const Table = ({ headers, rows }: any) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
          {headers.map((h: string) => <th key={h} style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row: any, idx: number) => (
          <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
            {row.map((cell: any, cidx: number) => <td key={cidx} style={{ padding: '12px' }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ============ LOADING SPINNER ============
export const Spinner = () => (
  <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid #e5e7eb', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

// ============ ALERT ============
export const Alert = ({ type = 'info', title, message }: any) => {
  const colors: Record<string, string> = { success: '#d1fae5', error: '#fee2e2', info: '#dbeafe', warning: '#fef3c7' };
  const textColors: Record<string, string> = { success: '#065f46', error: '#7f1d1d', info: '#0c4a6e', warning: '#78350f' };
  return (
    <div style={{ backgroundColor: colors[type] || colors.info, color: textColors[type] || textColors.info, padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
      {title && <strong>{title}</strong>}
      {message && <p style={{ margin: title ? '8px 0 0 0' : 0 }}>{message}</p>}
    </div>
  );
};

// ============ SIMPLE LINE CHART ============
export const LineChart = ({ data, height = 300 }: any) => {
  if (!data || data.length === 0) return <div>No data</div>;
  const maxValue = Math.max(...data.map((d: any) => d.value));
  const minValue = Math.min(...data.map((d: any) => d.value));
  const range = maxValue - minValue || 1;
  const width = 100 / (data.length - 1 || 1);
  
  return (
    <svg width="100%" height={height} style={{ border: '1px solid #e5e7eb', borderRadius: '6px' }}>
      {data.map((point: any, idx: number) => {
        const x = (idx * width) + '%';
        const y = ((maxValue - point.value) / range) * (height - 40) + 20;
        return (
          <g key={idx}>
            <circle cx={x} cy={y} r="4" fill="#3b82f6" />
            {idx < data.length - 1 && (
              <line x1={x} y1={y} x2={((idx + 1) * width) + '%'} y2={((maxValue - data[idx + 1].value) / range) * (height - 40) + 20} stroke="#3b82f6" strokeWidth="2" />
            )}
            <text x={x} y={height - 5} textAnchor="middle" fontSize="12" fill="#6b7280">{point.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ============ SIMPLE BAR CHART ============
export const BarChart = ({ data, height = 300 }: any) => {
  if (!data || data.length === 0) return <div>No data</div>;
  const maxValue = Math.max(...data.map((d: any) => d.value));
  const barWidth = 100 / (data.length * 1.5);
  
  return (
    <svg width="100%" height={height} style={{ border: '1px solid #e5e7eb', borderRadius: '6px' }}>
      {data.map((item: any, idx: number) => {
        const x = (idx * barWidth * 1.5) + '%';
        const barHeight = (item.value / maxValue) * (height - 40);
        const y = height - 20 - barHeight;
        return (
          <g key={idx}>
            <rect x={x} y={y} width={barWidth + '%'} height={barHeight} fill="#3b82f6" />
            <text x={`calc(${x} + ${barWidth / 2}%)`} y={height - 5} textAnchor="middle" fontSize="12" fill="#6b7280">{item.label}</text>
            <text x={`calc(${x} + ${barWidth / 2}%)`} y={y - 5} textAnchor="middle" fontSize="12" fill="#1f2937">{item.value}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ============ BADGE ============
export const Badge = ({ children, variant = 'primary' }: any) => {
  const colors: Record<string, string> = { primary: '#dbeafe', secondary: '#e5e7eb', success: '#d1fae5', error: '#fee2e2' };
  const textColors: Record<string, string> = { primary: '#0c4a6e', secondary: '#374151', success: '#065f46', error: '#7f1d1d' };
  return (
    <span style={{ backgroundColor: colors[variant] || colors.primary, color: textColors[variant] || textColors.primary, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
      {children}
    </span>
  );
};

// ============ TABS ============
export const Tabs = ({ tabs, activeTab, onTabChange }: any) => (
  <div>
    <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '16px' }}>
      {tabs.map((tab: any) => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)} style={{ padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : 'none', color: activeTab === tab.id ? '#3b82f6' : '#6b7280', fontWeight: activeTab === tab.id ? 600 : 400 }}>
          {tab.label}
        </button>
      ))}
    </div>
    <div>
      {tabs.find((t: any) => t.id === activeTab)?.content}
    </div>
  </div>
);

// ============ FORM VALIDATION ============
export const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export const validateUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
export const validateRequired = (value: string) => value.trim().length > 0;
export const validateNumber = (value: string) => !isNaN(Number(value)) && value.trim().length > 0;

// ============ ICONS (SIMPLE SVG) ============
export const Icon = ({ name, size = 24 }: any) => {
  const icons: Record<string, string> = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
  };
  return <div dangerouslySetInnerHTML={{ __html: icons[name] || '' }} style={{ width: size, height: size, display: 'inline-block' }} />;
};

// ============ GLOBAL STYLES ============
export const GlobalStyles = () => (
  <style>{`
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `}</style>
);
