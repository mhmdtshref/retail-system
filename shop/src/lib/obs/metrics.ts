type Labels = Record<string, string>;

class Counter {
  private values = new Map<string, number>();
  constructor(public name: string, public help: string, public labelNames: string[] = []) {}
  inc(labels: Labels = {}, value = 1) {
    const key = this.key(labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }
  private key(labels: Labels): string { return this.labelNames.map(l => `${l}="${escapeLabel(labels[l]||'')}"`).join(','); }
  export(): string {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n`;
    for (const [key, val] of this.values.entries()) {
      out += `${this.name}{${key}} ${val}\n`;
    }
    return out;
  }
}

class Histogram {
  private buckets: number[];
  private counts = new Map<string, number[]>();
  private sum = new Map<string, number>();
  private _count = new Map<string, number>();
  constructor(public name: string, public help: string, buckets: number[], public labelNames: string[] = []) { this.buckets = buckets.slice().sort((a,b)=>a-b); }
  observe(labels: Labels = {}, value: number) {
    const key = this.key(labels);
    const arr = this.counts.get(key) || new Array(this.buckets.length + 1).fill(0);
    let placed = false;
    for (let i=0;i<this.buckets.length;i++) { if (value <= this.buckets[i]) { arr[i]++; placed = true; break; } }
    if (!placed) arr[this.buckets.length]++;
    this.counts.set(key, arr);
    this.sum.set(key, (this.sum.get(key) || 0) + value);
    this._count.set(key, (this._count.get(key) || 0) + 1);
  }
  private key(labels: Labels): string { return this.labelNames.map(l => `${l}="${escapeLabel(labels[l]||'')}"`).join(','); }
  export(): string {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} histogram\n`;
    for (const [key, arr] of this.counts.entries()) {
      let cum = 0;
      for (let i=0;i<this.buckets.length;i++) {
        cum += arr[i];
        out += `${this.name}_bucket{${key},le="${this.buckets[i]}"} ${cum}\n`;
      }
      cum += arr[this.buckets.length];
      out += `${this.name}_bucket{${key},le="+Inf"} ${cum}\n`;
      out += `${this.name}_sum{${key}} ${this.sum.get(key) || 0}\n`;
      out += `${this.name}_count{${key}} ${this._count.get(key) || 0}\n`;
    }
    return out;
  }
}

class Registry {
  private metrics: (Counter|Histogram)[] = [];
  register<T extends Counter|Histogram>(metric: T): T { this.metrics.push(metric); return metric; }
  export(): string { return this.metrics.map(m => m.export()).join('\n'); }
}

function escapeLabel(v: string): string { return v.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/"/g,'\\"'); }

export const registry = new Registry();
export const httpRequestsTotal = registry.register(new Counter('http_requests_total', 'Total HTTP requests', ['route','method','status']));
export const dbOpsTotal = registry.register(new Counter('db_ops_total', 'Total DB operations', ['collection','op']));
export const ordersTotal = registry.register(new Counter('orders_total', 'Orders total by status', ['status']));
export const posSalesTotal = registry.register(new Counter('pos_sales_total', 'POS sales count'));
export const posSalesValueTotal = registry.register(new Counter('pos_sales_value_total', 'POS sales value sum'));
export const cacheHitsTotal = registry.register(new Counter('cache_hits_total', 'Cache hits', ['key']));
export const cacheMissesTotal = registry.register(new Counter('cache_misses_total', 'Cache misses', ['key']));

const HTTP_BUCKETS = [5,10,25,50,100,250,500,1000,2500];
export const httpRequestDuration = registry.register(new Histogram('http_request_duration_ms', 'HTTP request duration in ms', HTTP_BUCKETS, ['route','method']));

export function recordHttp(route: string, method: string, status: number, durationMs: number) {
  httpRequestsTotal.inc({ route, method, status: String(status) });
  httpRequestDuration.observe({ route, method }, durationMs);
}

export function recordDb(collection: string, op: string) { dbOpsTotal.inc({ collection, op }); }

export function exportProm(): string { return registry.export(); }
