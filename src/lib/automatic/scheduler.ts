// Bộ hẹn giờ chạy nền của app Automatic. Chạy trong trình duyệt khi EduGo đang mở:
// cứ vài giây kiểm tra các quy trình đang bật, bước Lịch chạy nào đến hạn thì giành mốc lịch trên máy chủ
// (chỉ 1 máy hoặc 1 thẻ giành được) rồi chạy quy trình và lưu lịch sử chạy.
import { useEffect } from 'react';
import type { Workflow } from './types';

export const AUTOMATIC_CHANGED = 'automatic:changed';
export const AUTOMATIC_EXECUTED = 'automatic:executed';

export function notifyAutomaticChanged() { try { window.dispatchEvent(new Event(AUTOMATIC_CHANGED)); } catch { /* bỏ qua */ } }

export function useAutomaticScheduler(user: { id: string; fullName?: string; username?: string } | null | undefined, enabled: boolean) {
  useEffect(() => {
    if (!user?.id || !enabled) return;
    let alive = true;
    // Nạp phần xử lý khi cần, trang chính không phải tải thêm thư viện ngày giờ và bộ chạy quy trình
    let mods: null | [typeof import('./schedule'), typeof import('./store'), typeof import('./engine')] = null;
    const ready = async () => (mods ||= await Promise.all([import('./schedule'), import('./store'), import('./engine')]));
    let flows: Workflow[] = [];
    let lastTick = Date.now();
    let lastLoad = 0;
    let missingTable = false;
    const running = new Set<string>();

    const load = async () => {
      if (missingTable) return;
      try { const [, { listActiveWorkflows }] = await ready(); flows = await listActiveWorkflows(user.id); lastLoad = Date.now(); }
      catch (e: any) { if (/AUTOMATIC\.sql/.test(e?.message || '')) missingTable = true; }
    };

    const fire = async (wf: Workflow, nodeName: string, ms: number) => {
      if (running.has(wf.id)) return;
      const [{ scheduleOutput }, { claimSlot, saveExecution }, { runWorkflow, uid }] = await ready();
      if (!(await claimSlot(wf.id, ms))) return;
      running.add(wf.id);
      const zone = wf.settings?.timezone || 'Asia/Ho_Chi_Minh';
      const executionId = uid();
      try {
        await saveExecution(user.id, { id: executionId, workflowId: wf.id, mode: 'schedule', status: 'running', startedAt: new Date().toISOString(), runData: {} }).catch(() => {});
        const exec = await runWorkflow(wf, { mode: 'schedule', user, triggerNode: nodeName, triggerItems: [{ json: scheduleOutput(ms, zone) }], executionId });
        await saveExecution(user.id, exec).catch(() => {});
        if (exec.status === 'error' && wf.settings?.notifyOnError) {
          const { pushNotificationToSupabase } = await import('../data');
          pushNotificationToSupabase({ title: `Quy trình "${wf.name}" chạy lỗi`, description: exec.error || '', type: 'error', targetAudience: 'custom_users', targetUserIds: [user.id], senderId: user.id, senderName: 'Automatic', metadata: { source: 'automatic', workflowId: wf.id } }).catch(() => {});
        }
        window.dispatchEvent(new CustomEvent(AUTOMATIC_EXECUTED, { detail: { workflowId: wf.id, executionId } }));
      } finally { running.delete(wf.id); }
    };

    const tick = async () => {
      const now = Date.now();
      const from = lastTick;
      lastTick = now;
      if (now - lastLoad > 60000) await load();
      if (!flows.length || !mods) return;
      const { dueBetween } = mods[0];
      for (const wf of flows) {
        for (const n of wf.nodes) {
          if (n.type !== 'scheduleTrigger' || n.disabled) continue;
          const due = dueBetween(n.parameters?.rules || [], from, now, wf.settings?.timezone || 'Asia/Ho_Chi_Minh');
          // Thẻ bị trình duyệt làm chậm thì chỉ chạy mốc gần nhất, không chạy dồn
          if (due.length) fire(wf, n.name, due[due.length - 1]);
        }
      }
    };

    const onChanged = () => { load(); };
    window.addEventListener(AUTOMATIC_CHANGED, onChanged);
    load();
    const t = window.setInterval(() => { if (alive) tick(); }, 5000);
    return () => { alive = false; window.clearInterval(t); window.removeEventListener(AUTOMATIC_CHANGED, onChanged); };
  }, [user?.id, enabled]);
}
