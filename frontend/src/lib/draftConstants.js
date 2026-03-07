export const DRAFT_MARKERS = [
  '<!-- draft:story -->',
  '<!-- draft:epic -->',
  '<!-- draft:objective -->',
  '<!-- draft:prd -->',
  '<!-- draft:milestone -->',
];

export const DRAFT_TYPES = {
  'draft:story': 'Story',
  'draft:epic': 'Epic',
  'draft:objective': 'Objective',
  'draft:prd': 'PRD',
  'draft:milestone': 'Milestone',
};

export const DRAFT_TYPE_COLORS = {
  'draft:story': 'var(--blue)',
  'draft:epic': 'var(--amber)',
  'draft:objective': 'var(--accent)',
  'draft:prd': '#a78bfa',
  'draft:milestone': '#2dd4bf',
};

export const SHORTCUT_ENDPOINTS = {
  'draft:story': '/api/create/story',
  'draft:epic': '/api/create/epic',
  'draft:milestone': '/api/create/milestone',
};
