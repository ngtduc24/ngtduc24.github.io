// Nhập quy trình xuất từ n8n (tệp JSON) hoặc từ chính Automatic.
// Các bước lõi được đổi sang bước tương ứng, bước chưa hỗ trợ đổi thành "Không làm gì" kèm ghi chú.
import type { WConnection, WNode, Workflow } from './types';
import { getNodeType } from './nodes';
import { newCondition } from './conditions';

const uid = () => Math.random().toString(36).slice(2, 10);

// n8n đánh dấu biểu thức bằng dấu = ở đầu chuỗi, Automatic nhận biết biểu thức qua {{ }}
function stripEq(v: any): any {
  if (typeof v === 'string') return v.startsWith('=') ? v.slice(1) : v;
  if (Array.isArray(v)) return v.map(stripEq);
  if (v && typeof v === 'object') { const o: any = {}; for (const k of Object.keys(v)) o[k] = stripEq(v[k]); return o; }
  return v;
}

function convConditions(c: any) {
  const list = (c?.conditions || []).map((x: any) => ({ id: x.id || uid(), leftValue: x.leftValue ?? '', rightValue: x.rightValue ?? '', operator: { type: x.operator?.type || 'string', operation: x.operator?.operation || 'equals' } }));
  return { combinator: c?.combinator === 'or' ? 'or' : 'and', conditions: list.length ? list : [newCondition()] };
}

function convert(type: string, p: any): { type: string; parameters: any } | null {
  const t = type.replace(/^n8n-nodes-base\./, '').replace(/^@n8n\/n8n-nodes-langchain\./, 'lc.');
  switch (t) {
    case 'manualTrigger': return { type: 'manualTrigger', parameters: {} };
    case 'scheduleTrigger': case 'cron': {
      const iv = p?.rule?.interval || [{}];
      return { type: 'scheduleTrigger', parameters: { rules: iv.map((r: any) => ({ field: r.field || 'days', ...r, triggerAtHour: r.triggerAtHour != null ? String(r.triggerAtHour) : (r.field && ['days', 'weeks', 'months'].includes(r.field) ? '0' : r.triggerAtHour), triggerAtDay: (r.triggerAtDay || (r.field === 'weeks' ? [0] : undefined))?.map((d: any) => String(d)) })) } };
    }
    case 'httpRequest': {
      const o = p.options || {};
      return { type: 'httpRequest', parameters: {
        method: p.method || 'GET', url: p.url || '', authentication: 'none',
        sendQuery: !!p.sendQuery, queryParameters: p.queryParameters?.parameters || [],
        sendHeaders: !!p.sendHeaders, headerParameters: p.headerParameters?.parameters || [],
        sendBody: !!p.sendBody, bodyContentType: p.contentType || 'json', specifyBody: p.specifyBody || 'keypair',
        bodyParameters: p.bodyParameters?.parameters || [], jsonBody: p.jsonBody || '', rawBody: p.body || '', rawContentType: p.rawContentType || 'text/plain',
        responseFormat: o.response?.response?.responseFormat === 'json' ? 'json' : o.response?.response?.responseFormat === 'text' ? 'text' : 'autodetect',
        fullResponse: !!o.response?.response?.fullResponse, neverError: !!o.response?.response?.neverError, timeout: o.timeout || 30000, splitArray: true,
      } };
    }
    case 'set': {
      if (p.mode === 'raw') return { type: 'set', parameters: { mode: 'raw', jsonOutput: p.jsonOutput || '{}', includeOtherFields: !!p.includeOtherFields, dotNotation: p.options?.dotNotation !== false } };
      const as = p.assignments?.assignments || (p.fields?.values || []).map((v: any) => ({ name: v.name, type: v.type === 'numberValue' ? 'number' : v.type === 'booleanValue' ? 'boolean' : 'string', value: v.stringValue ?? v.numberValue ?? v.booleanValue ?? '' }));
      return { type: 'set', parameters: { mode: 'manual', assignments: as.map((a: any) => ({ name: a.name, type: a.type || 'string', value: a.value })), includeOtherFields: !!p.includeOtherFields, dotNotation: p.options?.dotNotation !== false, ignoreConversionErrors: !!p.options?.ignoreConversionErrors } };
    }
    case 'if': case 'filter':
      return { type: t, parameters: { conditions: convConditions(p.conditions), ignoreCase: !!(p.options?.ignoreCase ?? (p.conditions?.options?.caseSensitive === false)), looseTypeValidation: p.looseTypeValidation ?? p.options?.looseTypeValidation ?? true } };
    case 'switch': {
      if (p.mode === 'expression') return { type: 'switch', parameters: { mode: 'expression', numberOutputs: p.numberOutputs || 4, output: p.output || '' } };
      const rules = (p.rules?.values || []).map((r: any) => ({ conditions: convConditions(r.conditions), renameOutput: !!r.renameOutput, outputKey: r.outputKey || '' }));
      const fb = p.options?.fallbackOutput;
      return { type: 'switch', parameters: { mode: 'rules', rules: rules.length ? rules : [{ conditions: convConditions(null), renameOutput: false, outputKey: '' }], fallbackOutput: fb === 'extra' ? 'extra' : fb == null || fb === 'none' ? 'none' : String(fb), allMatchingOutputs: !!p.options?.allMatchingOutputs, ignoreCase: !!p.options?.ignoreCase } };
    }
    case 'merge': {
      let mode = p.mode || 'append';
      if (mode === 'combine') mode = p.combineBy || p.combinationMode || 'combineByFields';
      if (mode === 'mergeByPosition') mode = 'combineByPosition';
      if (mode === 'multiplex') mode = 'combineAll';
      const f = p.fieldsToMatchString ? String(p.fieldsToMatchString).split(',')[0].trim() : p.advancedFields?.values?.[0]?.field1 || 'id';
      const f2 = p.fieldsToMatchString ? f : p.advancedFields?.values?.[0]?.field2 || f;
      return { type: 'merge', parameters: { mode: ['append', 'combineByPosition', 'combineByFields', 'combineAll', 'chooseBranch'].includes(mode) ? mode : 'append', field1: f, field2: f2, joinMode: p.joinMode || 'keepMatches', includeUnpaired: !!p.options?.includeUnpaired, useDataOfInput: String(p.useDataOfInput || '1') } };
    }
    case 'code': return { type: 'code', parameters: { mode: p.mode || 'runOnceForAllItems', jsCode: p.jsCode || '' } };
    case 'wait': return { type: 'wait', parameters: { resume: p.resume === 'specificTime' ? 'specificTime' : 'timeInterval', amount: p.amount ?? 1, unit: p.unit || 'seconds', dateTime: p.dateTime || '' } };
    case 'dateTime': return { type: 'dateTime', parameters: { operation: p.operation || 'getCurrentDate', includeTime: p.includeTime !== false, date: p.magnitude || p.date || '', duration: p.duration ?? 1, timeUnit: p.timeUnit || 'days', format: p.format === 'custom' ? p.customFormat : p.format || 'dd/MM/yyyy', startDate: p.startDate || '', endDate: p.endDate || '', units: Array.isArray(p.units) ? p.units[0] : p.units || 'days', part: p.part || 'month', outputFieldName: p.outputFieldName || 'ngayGio' } };
    case 'sort': return { type: 'sort', parameters: { type: p.type === 'random' ? 'random' : 'simple', sortFieldsUi: p.sortFieldsUi?.sortField || [] } };
    case 'limit': return { type: 'limit', parameters: { maxItems: p.maxItems ?? 1, keep: p.keep || 'firstItems' } };
    case 'removeDuplicates': return { type: 'removeDuplicates', parameters: { compare: p.compare || 'allFields', fieldsToCompare: p.fieldsToCompare || '', fieldsToExclude: p.fieldsToExclude || '' } };
    case 'splitOut': return { type: 'splitOut', parameters: { fieldToSplitOut: p.fieldToSplitOut || '', include: p.include === 'allOtherFields' ? 'allOtherFields' : 'noOtherFields', destinationFieldName: p.options?.destinationFieldName || '' } };
    case 'aggregate': return { type: 'aggregate', parameters: { aggregate: p.aggregate || 'aggregateIndividualFields', destinationFieldName: p.destinationFieldName || 'data', fieldsToAggregate: (p.fieldsToAggregate?.fieldToAggregate || []).map((f: any) => ({ fieldToAggregate: f.fieldToAggregate, outputFieldName: f.renameField ? f.outputFieldName : '' })) } };
    case 'noOp': return { type: 'noOp', parameters: {} };
    case 'stopAndError': return { type: 'stopAndError', parameters: { errorMessage: p.errorMessage || 'Lỗi' } };
  }
  return null;
}

export interface ImportResult { name: string; nodes: WNode[]; connections: WConnection[]; settings: any; unsupported: string[] }

export function importWorkflowJson(text: string): ImportResult {
  let j: any;
  try { j = JSON.parse(text); } catch { throw new Error('Tệp không phải JSON hợp lệ'); }
  if (j && j.format === 'edugo-automatic') {
    return { name: j.name || 'Quy trình nhập', nodes: j.nodes || [], connections: j.connections || [], settings: j.settings || {}, unsupported: [] };
  }
  if (!j || !Array.isArray(j.nodes)) throw new Error('Không tìm thấy danh sách bước (nodes) trong tệp');
  const unsupported: string[] = [];
  const nodes: WNode[] = [];
  for (const n of j.nodes) {
    if (/stickyNote$/.test(n.type || '')) continue;
    const c = convert(String(n.type || ''), stripEq(n.parameters || {}));
    const ok = c && getNodeType(c.type);
    if (!ok) unsupported.push(`${n.name} (${n.type})`);
    nodes.push({
      id: n.id || uid(), name: n.name, position: Array.isArray(n.position) ? [n.position[0], n.position[1]] : [0, 0],
      type: ok ? c!.type : 'noOp', parameters: ok ? c!.parameters : {}, disabled: !!n.disabled,
      notes: ok ? n.notes : `Bước n8n chưa hỗ trợ: ${n.type}`,
      settings: { alwaysOutputData: !!n.alwaysOutputData, executeOnce: !!n.executeOnce, continueOnFail: !!n.continueOnFail || n.onError === 'continueRegularOutput', retryOnFail: !!n.retryOnFail, maxTries: n.maxTries, waitBetweenTries: n.waitBetweenTries },
    });
  }
  const names = new Set(nodes.map(n => n.name));
  const connections: WConnection[] = [];
  for (const [from, v] of Object.entries<any>(j.connections || {})) {
    (v?.main || []).forEach((outs: any[], oi: number) => {
      (outs || []).forEach((c: any) => { if (names.has(from) && names.has(c.node)) connections.push({ from, fromOutput: oi, to: c.node, toInput: c.index || 0 }); });
    });
  }
  return { name: j.name || 'Quy trình nhập từ n8n', nodes, connections, settings: { timezone: j.settings?.timezone && j.settings.timezone !== 'DEFAULT' ? j.settings.timezone : 'Asia/Ho_Chi_Minh', saveManualExecutions: true }, unsupported };
}

export function exportWorkflowJson(wf: Workflow): string {
  return JSON.stringify({ format: 'edugo-automatic', version: 1, name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }, null, 2);
}
