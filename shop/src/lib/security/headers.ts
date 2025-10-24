import { NextResponse, type NextRequest } from 'next/server';

export type HeaderOptions = {
  cspNonce?: string;
  cspImgDomains?: string[];
  frameAncestors?: string[]; // if empty -> DENY
  scriptSrcDomains?: string[]; // extra script-src hosts
  connectSrcDomains?: string[]; // extra connect-src hosts
  frameSrcDomains?: string[]; // extra frame-src hosts (iframes)
};

export function applySecurityHeaders(req: NextRequest, res: NextResponse, opts: HeaderOptions = {}): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';
  const self = "'self'";
  const nonce = opts.cspNonce ? `'nonce-${opts.cspNonce}'` : '';
  const imgSrc = [self, 'data:', 'blob:', ...(opts.cspImgDomains || [])].join(' ');
  const connectSrc = [self, process.env.NEXT_PUBLIC_BASE_URL || '', ...(opts.connectSrcDomains || [])]
    .filter(Boolean)
    .join(' ');
  const styleSrc = [self, nonce || "'unsafe-inline'"].join(' ');
  const scriptSrcParts = [self, nonce || "'unsafe-inline'", ...(opts.scriptSrcDomains || [])];
  if (!isProd) scriptSrcParts.push("'unsafe-eval'");
  const scriptSrc = scriptSrcParts.join(' ');
  const frameAncestors = (opts.frameAncestors && opts.frameAncestors.length)
    ? opts.frameAncestors.join(' ')
    : "'none'";
  const frameSrc = [self, ...(opts.frameSrcDomains || [])].join(' ');

  const csp = [
    `default-src ${self}`,
    `img-src ${imgSrc}`,
    `style-src ${styleSrc}`,
    `script-src ${scriptSrc}`,
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    `font-src ${self} data:`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `frame-ancestors ${frameAncestors}`,
    `upgrade-insecure-requests`,
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', frameAncestors === "'none'" ? 'DENY' : 'SAMEORIGIN');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (isProd) res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return res;
}
