import React, { useState } from 'react';
import api from '../utils/axios';

const ImageUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.success) setResult(data.data);
      else setError(data.message || 'Upload failed');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', padding: '1rem', border: '1px solid #333', borderRadius: 8 }}>
      <h2 style={{ marginBottom: 12 }}>Test Image Upload</h2>
      <input type="file" accept="image/*,video/*" onChange={handleFileChange} />
      <div style={{ marginTop: 12 }}>
        <button onClick={handleUpload} disabled={!file || uploading} style={{ padding: '6px 14px' }}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      {error && <div style={{ marginTop: 12, color: '#e63946', fontSize: 14 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 16, fontSize: 14 }}>
          <div><strong>Name:</strong> {result.name}</div>
            <div><strong>URL:</strong> <a href={result.url} target="_blank" rel="noreferrer">{result.url}</a></div>
            {result.thumbnailUrl && <div><strong>Thumb:</strong> <a href={result.thumbnailUrl} target="_blank" rel="noreferrer">Thumbnail</a></div>}
            {/^image\//i.test(result.fileType) && <img src={result.url} alt={result.name} style={{ maxWidth: '100%', marginTop: 8, borderRadius: 4 }} />}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;