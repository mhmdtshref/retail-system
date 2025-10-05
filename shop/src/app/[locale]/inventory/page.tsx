import { redirect } from 'next/navigation';

export default function InventoryIndex() {
  // Redirect to adjustments tab by default
  redirect('./inventory/adjustments');
}


