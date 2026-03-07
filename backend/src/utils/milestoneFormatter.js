export function formatMilestoneEntry(name, description) {
  const stripped = description
    .replace(/^#+\s+.+\n*/m, '')
    .replace(/^-\s+\[[ x]\]\s+.+\n*/m, '')
    .trim();
  const indented = stripped
    .split('\n')
    .map((line) => (line.trim() ? `    ${line}` : ''))
    .join('\n');
  return `- [ ] ${name}\n${indented}`;
}

export function appendToMilestonesSection(currentDesc, milestoneEntry) {
  const MILESTONES_HEADER = '# MILESTONES';
  const COMMITTED_HEADER = '#### COMMITTED MILESTONES';
  const ENG_HEADER = '# ENGINEERING CONSIDERATIONS';

  if (currentDesc.includes(MILESTONES_HEADER)) {
    const anchor = currentDesc.includes(COMMITTED_HEADER) ? COMMITTED_HEADER : MILESTONES_HEADER;
    const anchorEnd = currentDesc.indexOf(anchor) + anchor.length;
    const afterAnchor = currentDesc.slice(anchorEnd);
    const nextSection = afterAnchor.match(/\n#{1,2} /);
    if (nextSection) {
      const insertAt = anchorEnd + nextSection.index;
      return currentDesc.slice(0, insertAt).trimEnd() + '\n\n' + milestoneEntry + '\n\n' + currentDesc.slice(insertAt).trimStart();
    }
    return currentDesc.trimEnd() + '\n\n' + milestoneEntry;
  }
  if (currentDesc.includes(ENG_HEADER)) {
    const idx = currentDesc.indexOf(ENG_HEADER);
    return currentDesc.slice(0, idx).trimEnd() + '\n\n# MILESTONES\n#### COMMITTED MILESTONES\n\n' + milestoneEntry + '\n\n' + currentDesc.slice(idx);
  }
  return currentDesc.trimEnd() + '\n\n# MILESTONES\n#### COMMITTED MILESTONES\n\n' + milestoneEntry;
}
