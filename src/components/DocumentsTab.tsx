import React, { useState } from 'react';
import { FolderOpen, FilePlus, Download, Trash2, FileText, FileImage, File, X } from 'lucide-react';
import { StoredDocument } from '../types';

interface Props {
  documents: StoredDocument[];
  onAdd: (name: string, category: StoredDocument['category'], file: File) => Promise<void>;
  onDelete: (id: string) => void;
  onGetUrl: (storagePath: string) => Promise<string | null>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType, size = 20 }: { mimeType: string; size?: number }) {
  if (mimeType.startsWith('image/')) return <FileImage size={size} className="text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText size={size} className="text-red-500" />;
  return <File size={size} className="text-gray-400" />;
}

const DOC_CATEGORIES: { id: StoredDocument['category']; label: string }[] = [
  { id: 'vertraege', label: 'Verträge' },
  { id: 'sonstiges', label: 'Sonstige Dateien' },
];

export function DocumentsTab({ documents, onAdd, onDelete, onGetUrl }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState<StoredDocument['category']>('vertraege');
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function resetUploadForm() {
    setShowUpload(false);
    setSelectedFile(null);
    setFileName('');
    setCategory('vertraege');
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await onAdd(fileName.trim() || selectedFile.name, category, selectedFile);
      resetUploadForm();
    } finally {
      setUploading(false);
    }
  }

  async function handleOpen(doc: StoredDocument) {
    setOpeningId(doc.id);
    try {
      const url = await onGetUrl(doc.storagePath);
      if (url) window.open(url, '_blank');
    } finally {
      setOpeningId(null);
    }
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    onDelete(id);
    setTimeout(() => setDeletingId(null), 500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Dokumentenablage</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 bg-slate-700 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <FilePlus size={16} />
          Hochladen
        </button>
      </div>

      {DOC_CATEGORIES.map(cat => {
        const catDocs = documents.filter(d => d.category === cat.id);
        return (
          <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <FolderOpen size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-700">{cat.label}</h3>
              <span className="ml-auto text-xs text-gray-400">{catDocs.length}</span>
            </div>
            {catDocs.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                Keine Dateien
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {catDocs.map(doc => (
                  <div key={doc.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <FileIcon mimeType={doc.mimeType} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium leading-tight" style={{ wordBreak: 'break-word' }}>
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatBytes(doc.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => handleOpen(doc)}
                        disabled={openingId === doc.id}
                        className="p-2 text-gray-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40"
                        aria-label="Öffnen"
                      >
                        {openingId === doc.id
                          ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          : <Download size={16} />
                        }
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        aria-label="Löschen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {documents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FolderOpen size={52} className="mb-3 opacity-25" />
          <p className="font-medium text-gray-500">Noch keine Dokumente</p>
          <p className="text-sm mt-1">Tippe auf <strong>Hochladen</strong> um zu starten</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Dokument hochladen</h3>
              <button
                onClick={resetUploadForm}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* File picker */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Datei</label>
              <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-slate-400 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setSelectedFile(f); setFileName(f.name); }
                  }}
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-slate-700 flex-wrap">
                    <FileIcon mimeType={selectedFile.type} size={18} />
                    <span className="text-sm font-medium break-all">{selectedFile.name}</span>
                    <span className="text-xs text-gray-400">({formatBytes(selectedFile.size)})</span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Tippen zum Auswählen</span>
                )}
              </label>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Name (optional)</label>
              <input
                type="text"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                placeholder="Dateiname…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Kategorie</label>
              <div className="flex gap-2">
                {DOC_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      category === cat.id ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-slate-700 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Wird hochgeladen…
                </>
              ) : 'Hochladen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
