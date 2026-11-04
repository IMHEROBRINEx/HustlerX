'use client';

import * as React from 'react';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';

interface UploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export function UploadZone({ onUpload, isLoading = false, disabled = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      setError(null);

      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
      if (droppedFiles.length === 0) {
        setError('Please upload CSV files');
        return;
      }

      const newFiles = [...files, ...droppedFiles];
      setFiles(newFiles);
      try {
        await onUpload(newFiles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [onUpload, files]
  );

  const handleFileSelect = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []).filter(f => f.name.endsWith('.csv'));
      if (selectedFiles.length === 0) {
        setError('Please select CSV files');
        return;
      }

      setError(null);
      const newFiles = [...files, ...selectedFiles];
      setFiles(newFiles);
      try {
        await onUpload(newFiles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [onUpload, files]
  );

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card
      className={cn(
        'w-full border-ember/20 bg-hearth-ash/70 text-parchment transition-all duration-200',
        isDragging && 'border-ember border-2',
        disabled && 'opacity-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="p-6">
        <div
          className={cn(
            'flex flex-col items-center justify-center w-full min-h-40 border-2 border-dashed rounded-lg cursor-pointer',
            isDragging
              ? 'border-ember bg-ember/10'
              : 'border-ember/30 bg-obsidian/40 hover:border-ember/55',
            disabled && 'cursor-not-allowed'
          )}
          onClick={disabled ? undefined : handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled}
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-ember animate-spin" />
              <p className="text-sm text-parchment/70">Analyzing your LinkedIn data...</p>
            </div>
          ) : files.length > 0 ? (
            <div className="flex flex-col items-center gap-2 max-h-32 overflow-y-auto w-full px-4">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-parchment w-full justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-ember shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    className="text-red-300 hover:text-red-200 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-parchment/65">Click to add more files</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-ember" />
              <p className="text-sm text-parchment/70">
                <span className="font-semibold text-ember">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-parchment/60">Multiple CSV files from LinkedIn export</p>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-sm text-red-200 text-center">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
