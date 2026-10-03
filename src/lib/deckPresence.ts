import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

// Ai đang mở cùng một tài liệu: mỗi khung soạn tham gia kênh realtime riêng của tài liệu đó.
// Trả về danh sách người khác (không gồm chính mình) đang ở trong khung soạn, gộp theo tài khoản.
// spot là vị trí người đó đang làm việc (ví dụ phần đang sửa của giáo trình), cập nhật khi đổi.
export interface PresentPerson { id: string; name: string; since: string; spot?: string }

export function usePresence(room: string | null | undefined, me: { id: string; fullName?: string } | null | undefined, spot?: string | null): PresentPerson[] {
  const [people, setPeople] = useState<PresentPerson[]>([]);
  const chRef = useRef<any>(null);
  const since = useRef(new Date().toISOString());
  const spotRef = useRef(spot || '');
  spotRef.current = spot || '';
  useEffect(() => {
    if (!room || !me?.id) { setPeople([]); return; }
    const key = `${me.id}:${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(`deck_presence:${room}`, { config: { presence: { key } } });
    chRef.current = ch;
    const sync = () => {
      const st = ch.presenceState() as Record<string, Array<{ id?: string; name?: string; since?: string; spot?: string }>>;
      const map = new Map<string, PresentPerson>();
      Object.values(st).forEach(list => list.forEach(p => { if (p?.id && p.id !== me.id && !map.has(p.id)) map.set(p.id, { id: p.id, name: p.name || '', since: p.since || '', spot: p.spot || '' }); }));
      setPeople([...map.values()].sort((a, b) => a.since.localeCompare(b.since)));
    };
    ch.on('presence', { event: 'sync' }, sync).on('presence', { event: 'join' }, sync).on('presence', { event: 'leave' }, sync);
    ch.subscribe(status => { if (status === 'SUBSCRIBED') ch.track({ id: me.id, name: me.fullName || '', since: since.current, spot: spotRef.current }).catch(() => {}); });
    return () => { chRef.current = null; ch.untrack().catch(() => {}); supabase.removeChannel(ch); };
  }, [room, me?.id, me?.fullName]);
  // Đổi vị trí làm việc thì báo lại cho những người khác
  useEffect(() => {
    const ch = chRef.current;
    if (ch) ch.track({ id: me?.id, name: me?.fullName || '', since: since.current, spot: spot || '' }).catch(() => {});
  }, [spot]);
  return people;
}

export function useDeckPresence(deckId: string | null | undefined, me: { id: string; fullName?: string } | null | undefined): PresentPerson[] {
  return usePresence(deckId, me);
}
