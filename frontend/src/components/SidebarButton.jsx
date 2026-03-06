/**
 * Shared button for all sidebar actions.
 *
 * variant: 'default' | 'danger' | 'primary'
 *   default  — bg-elevated, subtle border, text-muted
 *   danger   — transparent bg, red border + text
 *   primary  — solid accent bg, white text
 *
 * size: 'md' (default) | 'sm'
 *   md — fontSize 12, padding 5px 10px  (input-paired buttons)
 *   sm — fontSize 11, padding 2px 8px   (inline / tight-space buttons)
 */
export default function SidebarButton({
  children,
  onClick,
  disabled = false,
  title,
  fullWidth = false,
  variant = 'default',
  size = 'md',
  style: extraStyle,
  ...props
}) {
  const sm = size === 'sm';

  const base = {
    borderRadius: 'var(--radius-sm)',
    fontSize: sm ? 11 : 12,
    padding: sm ? '2px 8px' : '5px 10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'border-color 0.15s, color 0.15s, opacity 0.15s',
    whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : undefined,
  };

  const variants = {
    default: {
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      color: disabled ? 'var(--text-dim)' : 'var(--text-muted)',
    },
    danger: {
      background: 'none',
      border: '1px solid var(--red)',
      color: 'var(--red)',
    },
    primary: {
      background: 'var(--accent)',
      border: 'none',
      color: '#fff',
      opacity: disabled ? 0.6 : 1,
    },
  };

  function handleMouseEnter(e) {
    if (disabled) return;
    if (variant === 'default') {
      e.currentTarget.style.borderColor = 'var(--text-dim)';
      e.currentTarget.style.color = 'var(--text)';
    } else {
      e.currentTarget.style.opacity = '0.75';
    }
  }

  function handleMouseLeave(e) {
    if (variant === 'default') {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.color = disabled ? 'var(--text-dim)' : 'var(--text-muted)';
    } else {
      e.currentTarget.style.opacity = '1';
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ ...base, ...variants[variant], ...extraStyle }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
}
