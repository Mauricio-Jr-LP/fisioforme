import imageCompression from 'browser-image-compression';
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
  let fileToUpload = file;
  
  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await imageCompression(file, {
        maxSizeMB: 0.2, // ~200KB max
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp' // Converte para webp para economizar mais espaço
      });
      console.log(`Original: ${(file.size / 1024).toFixed(1)}KB -> Comprimida: ${(fileToUpload.size / 1024).toFixed(1)}KB`);
    } catch (e) {
      console.error('Erro na compressão de imagem, usando original', e);
    }
  }

  const ext = fileToUpload.name.split('.').pop() || 'bin';
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${entityType}/${entityId}/${Date.now()}-${rand}.${ext}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, fileToUpload, {
    cacheControl: '3600',
    upsert: false,
    contentType: fileToUpload.type || undefined,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);

  return api<Attachment>('/attachments', {
    method: 'POST',
    body: {
      entity_type: entityType,
      entity_id: entityId,
      file_path: path,
      file_name: fileToUpload.name,
      file_type: fileToUpload.type || null,
      size_bytes: fileToUpload.size,
      caption: caption || null,
    },
  });
}
