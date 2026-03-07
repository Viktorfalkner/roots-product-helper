export default function StepFlow({ steps }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {steps.map((step, i) => (
        <span key={step} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent)',
            background: 'rgba(74,222,128,0.08)',
            border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: 4,
            padding: '4px 10px',
            whiteSpace: 'nowrap',
          }}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 300 }}>→</span>
          )}
        </span>
      ))}
    </div>
  );
}
