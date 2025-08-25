import api from '../utils/axios';

// Upload a single file to backend /api/upload
// Resolves { url, name, fileId, thumbnailUrl, ... }
export async function uploadFile(file, { folder } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (folder) form.append('folder', folder);
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  if (!data.success) throw new Error(data.message || 'Upload failed');
  return data.data;
}

export default { uploadFile };
