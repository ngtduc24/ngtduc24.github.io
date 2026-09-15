import { ARTarget } from '../types';

/**
 * Parses raw row from Supabase and extracts any metadata packed inside description.
 * This guarantees backwards and forwards compatibility, and prevents missing column errors.
 */
export function unpackARTarget(raw: any): ARTarget {
  if (!raw) return raw;

  let textDescription = raw.description || '';
  let extraConfig: Record<string, any> = {};

  if (typeof raw.description === 'string' && raw.description.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw.description);
      if (parsed && typeof parsed === 'object') {
        textDescription = parsed.text ?? '';
        extraConfig = parsed;
      }
    } catch {
      // Fallback: keep raw string description
    }
  }

  return {
    ...raw,
    description: textDescription,
    // Video settings
    is_transparent_video: raw.is_transparent_video ?? extraConfig.is_transparent_video ?? false,
    chroma_key_color: raw.chroma_key_color || extraConfig.chroma_key_color || '#00ff00',
    auto_play_video: raw.auto_play_video ?? extraConfig.auto_play_video ?? true,
    loop_video: raw.loop_video ?? extraConfig.loop_video ?? true,
    button_label: raw.button_label || extraConfig.button_label || '',
    button_url: raw.button_url || extraConfig.button_url || '',
    // Capture and Gestures
    enable_capture: raw.enable_capture ?? extraConfig.enable_capture ?? true,
    allow_user_rotate: raw.allow_user_rotate ?? extraConfig.allow_user_rotate ?? true,
    allow_user_scale: raw.allow_user_scale ?? extraConfig.allow_user_scale ?? true,
    allow_user_drag: raw.allow_user_drag ?? extraConfig.allow_user_drag ?? false,
  };
}

/**
 * Prepares payload to insert or update `ar_targets` in Supabase.
 * ONLY includes columns that physically exist in the Supabase table schema:
 * ['name', 'description', 'target_image_url', 'mind_file_url', 'thumbnail_url',
 *  'content_type', 'content_url', 'scale', 'rotation', 'position_x', 'position_y',
 *  'position_z', 'active', 'owner_id']
 * All extra configurations are securely serialized into `description` as JSON.
 */
export function packARTargetPayload(target: Partial<ARTarget> & { rawTextDescription?: string }) {
  const metadata = {
    text: target.rawTextDescription ?? target.description ?? '',
    is_transparent_video: target.is_transparent_video ?? false,
    chroma_key_color: target.chroma_key_color || '#00ff00',
    auto_play_video: target.auto_play_video ?? true,
    loop_video: target.loop_video ?? true,
    button_label: target.button_label || '',
    button_url: target.button_url || '',
    enable_capture: target.enable_capture ?? true,
    allow_user_rotate: target.allow_user_rotate ?? true,
    allow_user_scale: target.allow_user_scale ?? true,
    allow_user_drag: target.allow_user_drag ?? false,
  };

  return {
    name: target.name?.trim() || '',
    description: JSON.stringify(metadata),
    target_image_url: target.target_image_url || '',
    mind_file_url: target.mind_file_url || null,
    thumbnail_url: target.thumbnail_url || target.target_image_url || '',
    content_type: target.content_type || 'image',
    content_url: target.content_url || '',
    scale: typeof target.scale === 'number' ? target.scale : 1,
    rotation: typeof target.rotation === 'number' ? target.rotation : 0,
    position_x: typeof target.position_x === 'number' ? target.position_x : 0,
    position_y: typeof target.position_y === 'number' ? target.position_y : 0,
    position_z: typeof target.position_z === 'number' ? target.position_z : 0,
    active: target.active ?? true,
    owner_id: target.owner_id ?? null,
  };
}
