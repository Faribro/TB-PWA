'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Trash2, MessageSquare } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  author: string;
  pages: number;
  chunks: number;
  uploadedAt: string;
}

interface PDFLibraryProps {
  onSelectDoc: (docId: string, title: string) => void;
  activeDocId?: string;
}

export default function PDFLibrary({ onSelectDoc, activeDocId }: PDFLibraryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/upload-pdf');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      alert('Please upload a PDF file');
      return;
    }

    setUploading(true);
    setUploadProgress('Uploading...');

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('title', file.name);

      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setUploadProgress(`Processed ${data.pages} pages, ${data.chunks} chunks`);
        setTimeout(() => {
          setUploadProgress('');
          setUploading(false);
          loadDocuments();
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document?')) return;

    try {
      const res = await fetch(`/api/upload-pdf?docId=${docId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        loadDocuments();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      alert(`Delete failed: ${error.message}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          Document Library
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Upload policy documents and ask Genie questions
        </p>
      </div>

      {/* Upload Area */}
      <div className="p-4 border-b border-slate-700/50">
        <label
          className={`
            relative flex flex-col items-center justify-center
            h-32 border-2 border-dashed rounded-lg cursor-pointer
            transition-all duration-200
            ${uploading 
              ? 'border-cyan-500 bg-cyan-500/10' 
              : 'border-slate-600 hover:border-cyan-400 hover:bg-slate-800/50'
            }
          `}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          
          {uploading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2" />
              <p className="text-sm text-cyan-400">{uploadProgress}</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-sm text-slate-300">Click to upload PDF</p>
              <p className="text-xs text-slate-500 mt-1">NTEP Guidelines, Reports, Manuals</p>
            </>
          )}
        </label>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {documents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-slate-500"
            >
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No documents uploaded yet</p>
            </motion.div>
          ) : (
            documents.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`
                  p-3 rounded-lg border cursor-pointer group
                  transition-all duration-200
                  ${activeDocId === doc.id
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                  }
                `}
              >
                <div className="flex items-start justify-between" onClick={() => onSelectDoc(doc.id, doc.title)}>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-slate-200 truncate">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {doc.pages} pages &bull; {doc.chunks} chunks
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    {activeDocId === doc.id && (
                      <MessageSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 rounded transition-all"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-900/80">
        <p className="text-xs text-slate-500 text-center">
          {documents.length} document{documents.length !== 1 ? 's' : ''} in library
        </p>
      </div>
    </div>
  );
}
