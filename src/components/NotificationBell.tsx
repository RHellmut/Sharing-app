import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { isPushSupported, subscribeToPush, getCurrentSubscription, unsubscribeFromPush } from '../lib/pushNotifications';

export function NotificationBell() {
  const [status, setStatus] = useState<'loading' | 'unsupported' | 'enabled' | 'disabled'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) { setStatus('unsupported'); return; }
    getCurrentSubscription().then(sub => {
      setStatus(sub ? 'enabled' : 'disabled');
    });
  }, []);

  if (status === 'unsupported' || status === 'loading') return null;

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (status === 'enabled') {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
        }
        setStatus('disabled');
      } else {
        const sub = await subscribeToPush();
        if (sub?.endpoint && sub.keys) {
          await supabase.from('push_subscriptions').upsert({
            endpoint: sub.endpoint,
            p256dh: (sub.keys as Record<string, string>).p256dh,
            auth: (sub.keys as Record<string, string>).auth,
          });
          setStatus('enabled');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      title={status === 'enabled' ? 'Push-Benachrichtigungen deaktivieren' : 'Push-Benachrichtigungen aktivieren (2h-Erinnerung)'}
      className={`p-2 rounded-xl transition-colors ${
        status === 'enabled'
          ? 'text-green-600 hover:bg-green-50'
          : 'text-gray-400 hover:bg-gray-100'
      } ${busy ? 'opacity-50' : ''}`}
    >
      {status === 'enabled' ? <Bell size={20} /> : <BellOff size={20} />}
    </button>
  );
}
