import { supabase } from './supabase';
import { getEduCtx } from './edu';
import { uploadFileToSupabase } from './upload';

// =====================================================================
// Lớp dữ liệu module Remier (dựng phim). Dùng anon key, lọc theo owner_id
// (Firebase uid) ở client, giống edu / elearning. Không dùng RLS.
// =====================================================================

export type MvKind = 'video' | 'image' | 'audio' | 'effect' | 'template' | 'export';
export const REMIER_BUCKET = 'remier';

export interface MvAsset {
  id: string;
  scope: 'personal' | 'shared';
  owner_id?: string | null;
  owner_name?: string | null;
  folder_id?: string | null;
  category_id?: string | null;
  kind: MvKind;
  title: string;
  description?: string | null;
  tags: string[];
  url: string;
  thumb_url?: string | null;
  mime_type?: string | null;
  size_bytes: number;
  duration_ms?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  license?: string | null;
  source?: string | null;
  is_featured?: boolean;
  is_hidden?: boolean;
  created_at?: string;
  deleted_at?: string | null;
}

export interface MvProject {
  id: string;
  owner_id?: string | null;
  owner_name?: string | null;
  title: string;
  width: number;
  height: number;
  fps: number;
  duration_ms: number;
  timeline: any;
  thumb_url?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

const A_TABLE = 'remier_assets';
const P_TABLE = 'remier_projects';

function ctx() { return getEduCtx(); }

// --------------------------- Dự án ---------------------------

export async function getProjects(): Promise<MvProject[]> {
  const c = ctx();
  let q = supabase.from(P_TABLE).select('*').is('deleted_at', null).order('updated_at', { ascending: false });
  if (!c.isAdmin && c.userId) q = q.eq('owner_id', c.userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as MvProject[];
}

export async function getProject(id: string): Promise<MvProject> {
  const { data, error } = await supabase.from(P_TABLE).select('*').eq('id', id).single();
  if (error) throw error;
  return data as MvProject;
}

export async function createProject(input: { title: string; width?: number; height?: number; fps?: number; owner_name?: string }): Promise<MvProject> {
  const c = ctx();
  const payload: any = {
    title: input.title || 'Dự án không tên',
    width: input.width ?? 1920, height: input.height ?? 1080, fps: input.fps ?? 30,
    owner_id: c.userId, owner_name: input.owner_name ?? undefined,
    timeline: { tracks: [] },
  };
  const { data, error } = await supabase.from(P_TABLE).insert(payload).select('*').single();
  if (error) throw error;
  return data as MvProject;
}

export async function updateProject(id: string, patch: Partial<MvProject>): Promise<void> {
  const allowed: any = {};
  (['title', 'width', 'height', 'fps', 'duration_ms', 'timeline', 'thumb_url'] as (keyof MvProject)[])
    .forEach(k => { if (k in patch) allowed[k] = (patch as any)[k]; });
  const { error } = await supabase.from(P_TABLE).update(allowed).eq('id', id);
  if (error) throw error;
}

export async function softDeleteProject(id: string): Promise<void> {
  const { error } = await supabase.from(P_TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}
export async function getTrashProjects(): Promise<MvProject[]> {
  const c = ctx();
  let q = supabase.from(P_TABLE).select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  if (!c.isAdmin && c.userId) q = q.eq('owner_id', c.userId);
  const { data, error } = await q; if (error) throw error; return (data || []) as MvProject[];
}
export async function restoreProject(id: string): Promise<void> {
  const { error } = await supabase.from(P_TABLE).update({ deleted_at: null }).eq('id', id); if (error) throw error;
}
export async function purgeProject(id: string): Promise<void> {
  const { error } = await supabase.from(P_TABLE).delete().eq('id', id); if (error) throw error;
}

// --------------------------- Tư liệu ---------------------------

export async function getMyAssets(kind?: MvKind): Promise<MvAsset[]> {
  const c = ctx();
  let q = supabase.from(A_TABLE).select('*').eq('scope', 'personal').is('deleted_at', null).order('created_at', { ascending: false });
  if (!c.isAdmin && c.userId) q = q.eq('owner_id', c.userId);
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q; if (error) throw error; return (data || []).map(mapAsset);
}

export async function getSharedAssets(kind?: MvKind): Promise<MvAsset[]> {
  let q = supabase.from(A_TABLE).select('*').eq('scope', 'shared').eq('is_hidden', false).is('deleted_at', null).order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q; if (error) throw error; return (data || []).map(mapAsset);
}

function mapAsset(r: any): MvAsset { return { ...r, tags: r.tags || [] }; }

export async function addAsset(a: Partial<MvAsset> & { kind: MvKind; title: string; url: string }): Promise<MvAsset> {
  const c = ctx();
  const payload: any = {
    scope: a.scope ?? 'personal',
    owner_id: a.scope === 'shared' ? null : (a.owner_id ?? c.userId),
    owner_name: a.owner_name ?? undefined,
    kind: a.kind, title: a.title, description: a.description ?? null,
    tags: a.tags ?? [], url: a.url, storage_path: a.url, thumb_url: a.thumb_url ?? null,
    mime_type: a.mime_type ?? null, size_bytes: a.size_bytes ?? 0,
    duration_ms: a.duration_ms ?? null, width: a.width ?? null, height: a.height ?? null, fps: a.fps ?? null,
    license: a.license ?? null, source: a.source ?? null,
    is_featured: a.is_featured ?? false, is_hidden: a.is_hidden ?? false,
    category_id: a.category_id ?? null,
  };
  const { data, error } = await supabase.from(A_TABLE).insert(payload).select('*').single();
  if (error) throw error;
  return mapAsset(data);
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from(A_TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function updateAsset(id: string, patch: Partial<MvAsset>): Promise<void> {
  const allowed: any = {};
  (['title', 'description', 'tags', 'category_id', 'is_featured', 'is_hidden', 'license', 'source'] as (keyof MvAsset)[])
    .forEach(k => { if (k in patch) allowed[k] = (patch as any)[k]; });
  const { error } = await supabase.from(A_TABLE).update(allowed).eq('id', id);
  if (error) throw error;
}

// Tải file lên bucket remier theo dạng <owner_id>/<file>.
export async function uploadAssetFile(file: File): Promise<string> {
  const c = ctx();
  return uploadFileToSupabase(file, REMIER_BUCKET, `${c.userId || 'anon'}/`);
}

// Lưu tham chiếu tư liệu chung vào kho của tôi (không nhân đôi file).
export async function saveSharedToMine(asset: MvAsset, ownerName?: string): Promise<MvAsset> {
  return addAsset({
    scope: 'personal', kind: asset.kind, title: asset.title, url: asset.url, thumb_url: asset.thumb_url,
    mime_type: asset.mime_type, size_bytes: 0, duration_ms: asset.duration_ms, width: asset.width,
    height: asset.height, fps: asset.fps, tags: asset.tags, owner_name: ownerName,
  });
}
