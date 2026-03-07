const KEY = 'roots_guide_dismissed';
export const isDismissed = () => localStorage.getItem(KEY) === 'true';
export const dismiss = () => localStorage.setItem(KEY, 'true');
export const reset = () => localStorage.removeItem(KEY);
