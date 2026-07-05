'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload,
  FileText,
  Image,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';

type DocTipo = 'RG' | 'CNH' | 'COMPROVANTE_RESIDENCIA' | 'CERTIFICADO' | 'NF' | 'OUTROS';

const TIPO_OPTIONS: { value: DocTipo; label: string }[] = [
  { value: 'RG', label: 'RG' },
  { value: 'CNH', label: 'CNH' },
  { value: 'COMPROVANTE_RESIDENCIA', label: 'Comprovante de Residência' },
  { value: 'CERTIFICADO', label: 'Certificado' },
  { value: 'NF', label: 'Nota Fiscal' },
  { value: 'OUTROS', label: 'Outros' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

interface FilePreview {
  file: File;
  previewUrl: string | null;
  isImage: boolean;
  pageCount?: number;
}

export default function DocumentUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [tipo, setTipo] = useState<DocTipo>('OUTROS');
  const [cliente, setCliente] = useState('');
  const [pedido, setPedido] = useState('');
  const [descricao, setDescricao] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadSuccess = success;

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      return 'Tipo de arquivo não aceito. Use PDF, JPG ou PNG.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Arquivo muito grande. O tamanho máximo é 10 MB.';
    }
    return null;
  }, []);

  const processFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const isImage = file.type.startsWith('image/');
    let previewUrl: string | null = null;

    if (isImage) {
      previewUrl = URL.createObjectURL(file);
    }

    setFilePreview({ file, previewUrl, isImage });
    setProgress(0);
    setSuccess(false);
  }, [validateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleRemoveFile = useCallback(() => {
    if (filePreview?.previewUrl) URL.revokeObjectURL(filePreview.previewUrl);
    setFilePreview(null);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [filePreview]);

  const handleUpload = async () => {
    if (!filePreview || uploadSuccess) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', filePreview.file);
    formData.append('tipo', tipo);
    formData.append('cliente', cliente);
    formData.append('pedido', pedido);
    formData.append('descricao', descricao);

    try {
      const xhr = new XMLHttpRequest();

      const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ success: true });
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ success: false, error: data.error || 'Erro ao fazer upload.' });
            } catch {
              resolve({ success: false, error: 'Erro ao fazer upload.' });
            }
          }
        });

        xhr.addEventListener('error', () => {
          resolve({ success: false, error: 'Erro de conexão com o servidor.' });
        });

        xhr.open('POST', '/api/gs/storage/documentos');
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.send(formData);
      });

      if (result.success) {
        setSuccess(true);
        setProgress(100);
      } else {
        setError(result.error || 'Erro ao fazer upload.');
      }
    } catch {
      setError('Erro ao fazer upload.');
    } finally {
      setUploading(false);
    }
  };

  const canUpload = filePreview && tipo && !uploading;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Upload de Documento</h1>
          <p className="text-sm text-slate-400 mt-1">Faça upload de documentos para o armazenamento seguro</p>
        </div>
        <Link
          href="/gs/documentos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft size={14} />
          Voltar
        </Link>
      </div>

      {uploadSuccess ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 size={48} className="text-emerald-500" />
          </div>
          <h2 className="text-lg font-black text-emerald-800">Upload realizado com sucesso!</h2>
          <p className="text-sm text-emerald-600">O arquivo foi armazenado com segurança.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                handleRemoveFile();
                setSuccess(false);
                setTipo('OUTROS');
                setCliente('');
                setPedido('');
                setDescricao('');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              <Upload size={16} />
              Upload Novo
            </button>
            <Link
              href="/gs/documentos"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
            >
              Ver Documentos
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload size={40} className={`mx-auto mb-3 ${dragOver ? 'text-indigo-500' : 'text-slate-300'}`} />
            <p className={`text-sm font-semibold ${dragOver ? 'text-indigo-700' : 'text-slate-600'}`}>
              {dragOver ? 'Solte o arquivo aqui' : 'Arraste e solte o arquivo aqui'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              ou clique para selecionar
            </p>
            <p className="text-[10px] text-slate-400 mt-2">
              PDF, JPG ou PNG · Máx. 10 MB
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={18} className="text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">{error}</p>
            </div>
          )}

          {/* File Preview */}
          {filePreview && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {filePreview.isImage && filePreview.previewUrl ? (
                    <img src={filePreview.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <FileText size={28} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">{filePreview.file.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(filePreview.file.size / 1024 / 1024).toFixed(2)} MB · {filePreview.file.type || 'desconhecido'}
                  </p>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={uploading}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Remover arquivo"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Progress bar */}
              {uploading && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Enviando...</span>
                    <span className="font-semibold text-slate-700">{progress}%</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-700">Informações do Documento</h2>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Tipo de Documento
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as DocTipo)}
                disabled={uploading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {TIPO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Cliente
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente (autocomplete)"
                disabled={uploading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Pedido <span className="text-slate-300 font-normal normal-case">(opcional)</span>
              </label>
              <input
                type="text"
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
                placeholder="Número do pedido"
                disabled={uploading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Descrição <span className="text-slate-300 font-normal normal-case">(opcional)</span>
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição ou observações sobre o documento"
                rows={3}
                disabled={uploading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none disabled:opacity-50"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {uploading ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando...</>
              ) : (
                <><Upload size={16} /> Fazer Upload</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
