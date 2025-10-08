export function maskPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  const start = digits.slice(0, 2);
  const end = digits.slice(-2);
  return `${start}${'*'.repeat(Math.max(2, digits.length - 4))}${end}`;
}

export function maskEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const maskedUser = user.length <= 2 ? `${user[0] || ''}*` : `${user.slice(0, 2)}${'*'.repeat(user.length - 2)}`;
  return `${maskedUser}@${domain}`;
}

export function pickSafeAddress(addr?: any) {
  if (!addr) return undefined;
  return {
    label: addr.label,
    name_ar: addr.name_ar,
    name_en: addr.name_en,
    line1: addr.line1,
    line2: addr.line2,
    city: addr.city,
    state: addr.state,
    postal: addr.postal,
    country: addr.country,
    phone: maskPhone(addr.phone)
  };
}

export function sanitizeOrder(order: any) {
  if (!order) return null;
  const out: any = {
    id: String(order._id || order.id || ''),
    code: String(order._id || '').slice(-6),
    channel: order.channel || 'online',
    status: order.status,
    createdAt: order.createdAt || new Date().toISOString(),
    totals: { total: order.total, paid: order.paid, remaining: Math.max(0, (order.total || 0) - (order.paid || 0)) }
  };
  // Basic customer masking
  if (order.customer) {
    out.customer = {
      name: order.customer.name,
      phone: maskPhone(order.customer.phone),
      email: maskEmail(order.customer.email)
    };
  }
  return out;
}

export function sanitizeShipment(sh: any) {
  if (!sh) return null;
  return {
    // Use trackingNumber as public identifier instead of internal id
    id: String(sh.trackingNumber || `${sh.carrier}:${sh._id || ''}`),
    carrier: sh.carrier,
    trackingNumber: sh.trackingNumber,
    status: sh.status,
    labelUrl: sh.labelUrl,
    to: sh.to ? { ...sh.to, phone: maskPhone(sh.to.phone) } : undefined,
    cod: sh.cod,
    events: (sh.events || []).map((e: any) => ({ code: e.code, status: e.status, desc: e.desc, at: e.at }))
  };
}

