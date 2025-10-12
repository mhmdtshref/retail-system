export function isAdminToolsEnabled(): boolean {
  if (process.env.FORCE_DRY_RUN === 'true') return true; // staging playground still shows UI
  return process.env.ADMIN_TOOLS_ENABLED === 'true' || process.env.NEXT_PUBLIC_ADMIN_TOOLS_ENABLED === 'true';
}
