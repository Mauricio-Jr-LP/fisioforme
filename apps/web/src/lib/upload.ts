import { supabase, STORAGE_BUCKET } from './supabase';
import { api } from './api';
import type { Attachment, AttachmentEntity } from '@fisioforme/shared';

/**
 * Faz upload de um arquivo para o Supabase Storage e registra o anexo na API.
 */
export async function uploadAttachment(
  file: File,
  entityType: AttachmentEntity,
  entityId: string,
  caption?: string
): Promise<Attachment> {
  const ext = file.name.split('.').pop() || 'bin';
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${entityType}/${entityId}/${Date.now()}-${rand}.${ext}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);

  return api<Attachment>('/attachments', {
    method: 'POST',
    body: {
      entity_type: entityType,
      entity_id: entityId,
      file_path: path,
      file_name: file.name,
      file_type: file.type || null,
      size_bytes: file.size,
      caption: caption || null,
    },
  });
}
