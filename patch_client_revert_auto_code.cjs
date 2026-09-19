const fs = require('fs');
let code = fs.readFileSync('src/components/QualitativeAnalysis.tsx', 'utf-8');

const replacementBlock = `  const handleAiAutoCoding = async () => {
    if (!activeDoc) {
      showToast('error', 'Vui lòng chọn một tệp văn bản.');
      return;
    }
    if (currentCodes.length === 0) {
      showToast('error', 'Hãy tạo trước một số mã/chủ đề trong Codebook để AI làm căn cứ phân tích.');
      return;
    }

    setIsAiCodingLoading(true);
    try {
      const response = await fetch('/api/qda/auto-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: activeDoc.plainText
        })
      });

      if (!response.ok) {
        throw new Error('API server returned error');
      }

      const result = await response.json();
      if (result.suggestions && result.suggestions.length > 0) {
        // Prompt user for each suggestion
        for (const s of result.suggestions) {
          const shouldCreateCode = await confirm('AI đề xuất mã mới', \`AI đề xuất mã mới: "\${s.codeName}" - Mô tả: \${s.description}\\n\\nĐoạn văn: "\${s.text?.substring(0, 50)}..."\\n\\nBạn có muốn tạo mã này và gắn vào đoạn văn trên không?\`);
          
          if (shouldCreateCode) {
            // Check if code exists
            let code = currentCodes.find(c => c.name === s.codeName);
            let codeId = code?.id;

            if (!codeId) {
              // Create new code
              const newCode = {
                id: \`code-\${Date.now()}-\${Math.random().toString(36).substring(7)}\`,
                name: s.codeName,
                description: s.description,
                color: '#888888', // Default color
                projectId: selectedProjectId,
                parentCodeId: null
              };
              saveCodes([...currentCodes, newCode as any]);
              codeId = newCode.id;
            }

            // Create annotation
            const newAnnotation: QDAAnnotation = {
              id: \`ann-ai-\${Date.now()}-\${Math.random().toString(36).substring(7)}\`,
              docId: activeDoc.id,
              codeId: codeId!,
              startIndex: s.startIndex,
              endIndex: s.endIndex,
              text: s.text,
              createdBy: 'AI Assistant',
              isAiSuggested: true,
              aiExplanation: s.explanation
            };
            saveAnnotations([...annotations, newAnnotation]);
          }
        }
        showToast('success', \`Đã xử lý các đề xuất của AI!\`);
      } else {
        showToast('info', 'AI không tìm thấy gợi ý mã hóa mới nào.');
      }
    } catch (error) {
      console.warn("AI Auto Coding online failed, using intelligent local semantic fallback:", error);
      
      // Resilient Client-side Fallback
      // Simulate semantic matching
      const suggestions: QDAAnnotation[] = [];
      const text = activeDoc.plainText;
      
      currentCodes.forEach(code => {
        const keywords = code.name.toLowerCase().split(' ');
        keywords.forEach(kw => {
          if (kw.length > 3) {
            let idx = text.toLowerCase().indexOf(kw);
            while (idx !== -1) {
              const start = Math.max(0, idx - 30);
              const end = Math.min(text.length, idx + kw.length + 50);
              const segment = text?.substring(start, end);
              
              const isDuplicate = annotations.some(a => a.docId === activeDoc.id && a.startIndex === start);
              const isLocalDuplicate = suggestions.some(s => s.startIndex === start);

              if (!isDuplicate && !isLocalDuplicate && segment.length > 10) {
                suggestions.push({
                  id: \`ann-ai-\${Date.now()}-\${Math.random().toString(36).substring(7)}\`,
                  docId: activeDoc.id,
                  codeId: code.id,
                  startIndex: start,
                  endIndex: end,
                  text: segment,
                  createdBy: 'AI Assistant',
                  isAiSuggested: true,
                  aiExplanation: \`Trùng khớp ngữ nghĩa tự động với từ khóa "\${kw}" của chủ đề \${code.name}.\`
                });
              }
              idx = text.toLowerCase().indexOf(kw, idx + 1);
            }
          }
        });
      });

      if (suggestions.length > 0) {
        saveAnnotations([...annotations, ...suggestions.slice(0, 3)]);
        showToast('info', \`Đã tạo \${Math.min(3, suggestions.length)} đề xuất mã hóa cục bộ dựa trên từ khóa.\`);
      } else {
        showToast('info', 'Không tìm thấy kết quả phù hợp nào.');
      }
    } finally {
      setIsAiCodingLoading(false);
    }
  };`;

// Try to replace directly
const indexOfStart = code.indexOf('const handleAiAutoCoding = async () => {');
const indexOfEnd = code.indexOf('const handleAcceptAiAnnotation = (id: string) => {');

if (indexOfStart !== -1 && indexOfEnd !== -1) {
  const actualTarget = code.substring(indexOfStart, indexOfEnd);
  code = code.replace(actualTarget, replacementBlock + '\n\n  ');
  fs.writeFileSync('src/components/QualitativeAnalysis.tsx', code);
  console.log('Reverted QualitativeAnalysis.tsx');
} else {
  console.log('Failed to find boundaries in QualitativeAnalysis.tsx');
}
