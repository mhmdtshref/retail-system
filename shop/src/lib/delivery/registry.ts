import type { CarrierAdapter } from './adapters/types';
import { AramexAdapter } from './adapters/aramex';
import { GenericWebhookAdapter } from './adapters/webhook_generic';
import { DHLAdapter, FedExAdapter, SMSAAdapter } from './adapters/stubs';

export function getAdapterFor(type: 'aramex'|'smsa'|'dhl'|'fedex'|'webhook_generic'): CarrierAdapter {
  switch (type) {
    case 'aramex': return AramexAdapter;
    case 'smsa': return SMSAAdapter;
    case 'dhl': return DHLAdapter;
    case 'fedex': return FedExAdapter;
    case 'webhook_generic': return GenericWebhookAdapter;
    default: return GenericWebhookAdapter;
  }
}

