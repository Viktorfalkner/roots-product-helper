import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DraftCard from './DraftCard.jsx';

const DRAFT_MARKERS = ['<!-- draft:story -->', '<!-- draft:epic -->', '<!-- draft:objective -->', '<!-- draft:prd -->', '<!-- draft:milestone -->'];

function getDraftType(content) {
  for (const marker of DRAFT_MARKERS) {
    if (content.includes(marker)) {
      return marker.replace('<!-- ', '').replace(' -->', '');
    }
  }
  return null;
}

/**
 * Split a message into text segments and draft blocks.
 * A draft block starts with a <!-- draft:* --> marker and extends to the next
 * such marker or the end of the message.
 */
function parseMessageContent(content) {
  const markerPattern = /<!--\s*draft:(story|epic|objective|milestone)\s*-->/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = markerPattern.exec(content)) !== null) {
    // Text before this marker
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    // Find the end of this draft block: next marker or end of string
    const nextMarker = markerPattern.exec(content);
    if (nextMarker) {
      parts.push({
        type: 'draft',
        draftType: `draft:${match[1]}`,
        content: match[0] + content.slice(match.index + match[0].length, nextMarker.index),
      });
      lastIndex = nextMarker.index;
      // Reset to re-match from nextMarker's position
      markerPattern.lastIndex = nextMarker.index;
    } else {
      parts.push({
        type: 'draft',
        draftType: `draft:${match[1]}`,
        content: match[0] + content.slice(match.index + match[0].length),
      });
      lastIndex = content.length;
      break;
    }
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts;
}

export default function Message({ role, content, activeObjective, onSendMessage }) {
  const isUser = role === 'user';

  const parts = isUser ? [{ type: 'text', content }] : parseMessageContent(content);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
        padding: '0 16px',
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: 'var(--accent)',
            fontWeight: 600,
            flexShrink: 0,
            marginRight: 10,
            marginTop: 2,
          }}
        >
          R
        </div>
      )}

      <div style={{ maxWidth: '80%', minWidth: 0 }}>
        {parts.map((part, i) => {
          if (part.type === 'draft') {
            return (
              <DraftCard
                key={i}
                draftType={part.draftType}
                content={part.content}
                activeObjective={activeObjective}
                onSendMessage={onSendMessage}
              />
            );
          }

          if (!part.content.trim()) return null;

          return (
            <div
              key={i}
              style={{
                background: isUser ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                border: `1px solid ${isUser ? 'var(--border)' : 'var(--border-subtle)'}`,
                borderRadius: isUser
                  ? 'var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)'
                  : 'var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)',
                padding: '10px 14px',
                color: isUser ? 'var(--text)' : 'var(--text)',
              }}
            >
              {isUser ? (
                <span style={{ whiteSpace: 'pre-wrap' }}>{part.content}</span>
              ) : (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.content}</ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
