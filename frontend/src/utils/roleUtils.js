export const ALLOWED_ROLES = ['student', 'citizen', 'mentor', 'university', 'admin'];

export function normalizeRoles(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            return value ? [value] : [];
          }
        })()
      : [];

  const next = [];
  for (const item of raw) {
    const role = String(item || '').trim().toLowerCase();
    if (!role || !ALLOWED_ROLES.includes(role) || next.includes(role)) continue;
    next.push(role);
  }
  return next;
}

export function getPrimaryRole(user = {}) {
  const roles = normalizeRoles(user.roles || (user.role ? [user.role] : []));
  if (user.role && roles.includes(String(user.role).toLowerCase())) {
    return String(user.role).toLowerCase();
  }
  if (roles.length) return roles[0];
  if (user.role && ALLOWED_ROLES.includes(String(user.role).toLowerCase())) {
    return String(user.role).toLowerCase();
  }
  return 'student';
}

export function getDashboardPathForRole(role) {
  const safeRole = String(role || '').trim().toLowerCase();
  if (safeRole === 'admin') return '/admin';
  if (safeRole === 'citizen') return '/citizen-dashboard';
  if (safeRole === 'university') return '/university';
  if (safeRole === 'mentor') return '/mentor';
  return '/projects';
}