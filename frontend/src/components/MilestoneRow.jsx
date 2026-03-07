export default function MilestoneRow({ keyResult }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '5px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--text-dim)',
          marginTop: 5,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {keyResult.name || keyResult.type}
      </span>
    </div>
  );
}
