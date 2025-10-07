import type { Role } from './policies';

export type RouteRule = { pattern: RegExp; minRole?: Role; };

export const ROUTE_RULES: RouteRule[] = [
  { pattern: /^\/(ar|en)\/settings(\/.*)?$/, minRole: 'manager' },
  { pattern: /^\/(ar|en)\/finance(\/.*)?$/, minRole: 'manager' },
];
