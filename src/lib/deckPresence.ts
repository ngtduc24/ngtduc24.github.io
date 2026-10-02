import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Ai đang mở cùng một bài giảng: mỗi khung soạn tham gia kênh realtime riêng của bài giảng đó.
// Trả về danh sách người khác (không gồm chính mình) đang ở trong khung soạn, gộp theo tài khoản.
export interface PresentPerson { id: string; name: string; since: string }

export function useDeckPresence(deckId: string | null | undefined, me: { id: string; fullName?: string } | null | undefined): PresentPerson[] {
  const [people, setPeople] = useState<PresentPerson[]>([]);
  useEffect(() => {
    if (!deckId || !me?.id) { setPeople([]); return; }
    const key = `${me.id}:${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(`deck_presence:${deckId}`, { config: { presence: { key } } });
    const sync = () => {
      const st = ch.presenceState() as Record<string, Array<{ id?: string; name?: string; since?: string }>>;
      const map = new Map<string, PresentPerson>();
      Object.values(st).forEach(list => list.forEach(p => { if (p?.id && p.id !== me.id && !map.has(p.id)) map.set(p.id, { id: p.id, name: p.name || '', since: p.since || '' }); }));
      setPeople([...map.values()].sort((a, b) => a.since.localeCompare(b.since)));
    };
    ch.on('presence', { event: 'sync' }, sync).on('presence', { event: 'join' }, sync).on('presence', { event: 'leave' }, sync);
    ch.subscribe(status => { if (status === 'SUBSCRIBED') ch.track({ id: me.id, name: me.fullName || '', since: new Date().toISOString() }).catch(() => {}); });
    return () => { ch.untrack().catch(() => {}); supabase.removeChannel(ch); };
  }, [deckId, me?.id, me?.fullName]);
  return people;
}
