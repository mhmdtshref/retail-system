export function makeSaleKey(storeId: string, localSaleId: string) {
  return `${storeId}:${localSaleId}`;
}

export function makePaymentKey(saleKey: string, seq: number) {
  return `${saleKey}:p:${seq}`;
}

export function uuid(): string {
  // RFC4122-ish random UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

