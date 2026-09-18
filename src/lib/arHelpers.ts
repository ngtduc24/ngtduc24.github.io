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
    // Rotation 3 Axes & Lighting
    rotation_x: raw.rotation_x ?? extraConfig.rotation_x ?? (typeof raw.rotation === 'number' ? raw.rotation : 0),
    rotation_y: raw.rotation_y ?? extraConfig.rotation_y ?? 0,
    rotation_z: raw.rotation_z ?? extraConfig.rotation_z ?? 0,
    light_intensity: raw.light_intensity ?? extraConfig.light_intensity ?? 1.2,
    light_pos_x: raw.light_pos_x ?? extraConfig.light_pos_x ?? 5,
    light_pos_y: raw.light_pos_y ?? extraConfig.light_pos_y ?? 10,
    light_pos_z: raw.light_pos_z ?? extraConfig.light_pos_z ?? 7,
    light_rot_x: raw.light_rot_x ?? extraConfig.light_rot_x ?? 0,
    light_rot_y: raw.light_rot_y ?? extraConfig.light_rot_y ?? 0,
    light_rot_z: raw.light_rot_z ?? extraConfig.light_rot_z ?? 0,
    light_scale: raw.light_scale ?? extraConfig.light_scale ?? 1.0,
    // Mobile HUD Customization
    show_logo: raw.show_logo ?? extraConfig.show_logo ?? true,
    show_close_button: raw.show_close_button ?? extraConfig.show_close_button ?? true,
    show_gesture_hint: raw.show_gesture_hint ?? extraConfig.show_gesture_hint ?? true,
    show_target_name: raw.show_target_name ?? extraConfig.show_target_name ?? false,
    // Multi-Object & Material PBR Configuration
    scene_objects: raw.scene_objects ?? extraConfig.scene_objects ?? [],
    material_config: raw.material_config ?? extraConfig.material_config ?? undefined,
    scene_lights: raw.scene_lights ?? extraConfig.scene_lights ?? undefined,
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
    rotation_x: typeof target.rotation_x === 'number' ? target.rotation_x : (typeof target.rotation === 'number' ? target.rotation : 0),
    rotation_y: typeof target.rotation_y === 'number' ? target.rotation_y : 0,
    rotation_z: typeof target.rotation_z === 'number' ? target.rotation_z : 0,
    light_intensity: typeof target.light_intensity === 'number' ? target.light_intensity : 1.2,
    light_pos_x: typeof target.light_pos_x === 'number' ? target.light_pos_x : 5,
    light_pos_y: typeof target.light_pos_y === 'number' ? target.light_pos_y : 10,
    light_pos_z: typeof target.light_pos_z === 'number' ? target.light_pos_z : 7,
    light_rot_x: typeof target.light_rot_x === 'number' ? target.light_rot_x : 0,
    light_rot_y: typeof target.light_rot_y === 'number' ? target.light_rot_y : 0,
    light_rot_z: typeof target.light_rot_z === 'number' ? target.light_rot_z : 0,
    light_scale: typeof target.light_scale === 'number' ? target.light_scale : 1.0,
    show_logo: target.show_logo ?? true,
    show_close_button: target.show_close_button ?? true,
    show_gesture_hint: target.show_gesture_hint ?? true,
    show_target_name: target.show_target_name ?? false,
    scene_objects: target.scene_objects ?? [],
    material_config: target.material_config ?? undefined,
    scene_lights: target.scene_lights ?? undefined,
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
