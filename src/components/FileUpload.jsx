import { useRef, useState } from 'react';

const isCsv = (file) =>
  /\.(csv|tsv|txt)$/i.test(file.name) || ['text/csv', 'application/vnd.ms-excel'].includes(file.type);

/**
 * Drag-and-drop / click-to-browse CSV picker.
 * variant="hero"   -> large drop zone for the empty state
 * variant="button" -> compact button for replacing the current file
 */
export default function FileUpload({ onFile, onError, onSample, variant = 'hero', loading = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    if (!isCsv(file)) {
      onError?.(`“${file.name}” doesn't look like a CSV file. Please choose a .csv file.`);
      return;
    }
    onFile(file);
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".csv,.tsv,.txt,text/csv"
      hidden
      onChange={(e) => {
        handleFiles(e.target.files);
        e.target.value = ''; // allow re-selecting the same file
      }}
    />
  );

  if (variant === 'button') {
    return (
      <>
        {input}
        <button className="btn" onClick={() => inputRef.current?.click()}>
          <UploadIcon /> Upload new CSV
        </button>
      </>
    );
  }

  return (
    <div
      className={`dropzone${dragging ? ' is-dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
    >
      {input}
      <div className="dropzone-icon">
        <UploadIcon size={28} />
      </div>
      <p className="dropzone-title">
        {loading ? 'Reading file…' : 'Drop a CSV file here, or click to browse'}
      </p>
      <p className="dropzone-hint">The first row is used as column headers. Everything stays in your browser.</p>
      {onSample && (
        <button
          className="link-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSample();
          }}
        >
          or load the sample shampoo share-of-shelf audit
        </button>
      )}
    </div>
  );
}

function UploadIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4M6 10l6-6 6 6" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}
