const fs = require('fs');
let code = fs.readFileSync('src/components/ARModule.tsx', 'utf8');

const missingStr = `          </div>
        </div>
      </div>
    </div>
  );
}

function ARDropZone({ label, hint, accept, previewUrl, kind, fileName, onFile }: { label: string; hint: string; accept: string; previewUrl: string; kind: string; fileName: string; onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => inputRef.current && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) onFile(f); }}
      className={'relative cursor-pointer rounded-2xl border-2 border-dashed min-h-[200px] flex items-center justify-center overflow-hidden transition-all ' + (drag ? 'border-brand bg-brand/5' : 'border-slate-200 hover:border-brand bg-slate-50')}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onFile(f); }} />
      {previewUrl ? (
        <>
          {kind === 'video' ? (
            <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover" muted />
          ) : kind === '3d' ? (
            <div className="text-center text-brand px-3"><Box className="w-12 h-12 mx-auto" /><p className="text-xs font-semibold mt-2 break-all">{fileName}</p></div>
          ) : (
            <img src={previewUrl} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute top-2 right-2 bg-brand text-white rounded-full p-1"><Check className="w-4 h-4" /></div>
          {kind !== '3d' && <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-3 py-1.5 truncate">{fileName}</div>}
        </>
      ) : (
        <div className="text-center px-4 text-slate-400">
          <Upload className="w-8 h-8 mx-auto" />
          <p className="text-sm font-semibold mt-2 text-slate-600">{label}</p>
          <p className="text-xs mt-1">{hint}</p>
        </div>
      )}
    </div>
  );
}
`;

// Insert it before 'function ARCreateView'
code = code.replace(
  'function ARCreateView',
  missingStr + '\\nfunction ARCreateView'
);

fs.writeFileSync('src/components/ARModule.tsx', code);
