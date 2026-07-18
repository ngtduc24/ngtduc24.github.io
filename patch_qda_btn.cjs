const fs = require('fs');
let code = fs.readFileSync('src/components/QualitativeAnalysis.tsx', 'utf8');

code = code.replace(
  /<div className="flex items-center justify-between mb-6">\n\s*<h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">\n\s*<FolderKanban className="w-5 h-5 text-brand" \/>\n\s*Danh sách Dự án nghiên cứu\n\s*<\/h2>\n\s*<\/div>/,
  `<div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-brand" />
              Danh sách Dự án nghiên cứu
            </h2>
            {(isUserAdmin || currentUser?.canCreateQualitative) && (
              <button
                onClick={() => {
                  setEditingProjectId(null);
                  setNewProjName('');
                  setNewProjDesc('');
                  setNewProjSubjects([]);
                  setNewProjCount(0);
                  setShowNewProjectModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-sm font-bold transition-colors"
              >
                <Plus className="w-4 h-4" /> Thêm dự án
              </button>
            )}
          </div>`
);

fs.writeFileSync('src/components/QualitativeAnalysis.tsx', code);
