const fs = require('fs');

let content = fs.readFileSync('src/components/cms/ResearchLecturesNavCMS.tsx', 'utf8');

const navCode = `
      {/* SUB-VIEW 3: NAVIGATION MENU BUILDER PANEL */}
      {activeSubTab === 'nav' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Menu items timeline listing */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <Compass className="w-5 h-5 text-emerald-500" />
                <span>Liên kết Thanh điều hướng ({navList.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingNav({
                  id: 'nav_' + Date.now(),
                  label: '',
                  link: '',
                  target: '_self',
                  icon: 'Compass',
                  parentId: null,
                  sortOrder: navList.length + 1,
                  visible: true,
                  deviceType: 'all',
                  isFeatured: false
                })}
                className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm mục menu</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {navList.filter(n => !n.parentId).sort((a, b) => a.sortOrder - b.sortOrder).map((nav, idx, roots) => (
                <div key={nav.id} className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{nav.label}</span>
                        {nav.isFeatured && (
                          <span className="bg-amber-100 text-amber-800 font-black text-[8px] px-1.5 py-0.5 rounded uppercase font-mono">Nổi bật</span>
                        )}
                        {!nav.visible && (
                          <span className="bg-slate-200 text-slate-500 text-[8px] px-1.5 rounded uppercase font-mono">Ẩn</span>
                        )}
                        {nav.deviceType === 'desktop' && (
                          <span className="bg-blue-50 text-blue-600 text-[8px] px-1.5 py-0.5 rounded uppercase font-mono">Chỉ Desktop</span>
                        )}
                        {nav.deviceType === 'mobile' && (
                          <span className="bg-purple-50 text-purple-600 text-[8px] px-1.5 py-0.5 rounded uppercase font-mono">Chỉ Mobile</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono font-semibold truncate max-w-[200px]">{nav.link} {nav.target === '_blank' ? '🔗' : '⚓'}</p>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={idx === 0}
                        onClick={() => handleSortNav(nav.id, 'up')}
                        className="p-1 bg-white border border-slate-200 rounded hover:text-emerald-500 disabled:opacity-40"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={idx === roots.length - 1}
                        onClick={() => handleSortNav(nav.id, 'down')}
                        className="p-1 bg-white border border-slate-200 rounded hover:text-emerald-500 disabled:opacity-40"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingNav(nav)}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-emerald-500"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNav(nav.id)}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Children */}
                  <div className="pl-6 space-y-2">
                    {navList.filter(n => n.parentId === nav.id).sort((a, b) => a.sortOrder - b.sortOrder).map((child, cIdx, children) => (
                      <div key={child.id} className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-lg flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{child.label}</span>
                            {!child.visible && (
                              <span className="bg-slate-200 text-slate-500 text-[8px] px-1.5 rounded uppercase font-mono">Ẩn</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono font-semibold truncate max-w-[150px]">{child.link}</p>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={cIdx === 0}
                            onClick={() => handleSortNav(child.id, 'up')}
                            className="p-1 bg-slate-50 rounded hover:text-emerald-500 disabled:opacity-40"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={cIdx === children.length - 1}
                            onClick={() => handleSortNav(child.id, 'down')}
                            className="p-1 bg-slate-50 rounded hover:text-emerald-500 disabled:opacity-40"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingNav(child)}
                            className="p-1 bg-slate-50 rounded hover:text-emerald-500"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNav(child.id)}
                            className="p-1 bg-slate-50 rounded hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {navList.length === 0 && (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Chưa có mục menu nào.<br/>Vui lòng "Thêm mục menu" để cấu hình điều hướng.</p>
                </div>
              )}
            </div>
          </div>

          {/* Edit Form */}
          {editingNav && (
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm sticky top-6">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 uppercase tracking-wider">
                {navList.find(n => n.id === editingNav.id) ? 'Sửa mục menu' : 'Thêm mục menu mới'}
              </h4>
              <form onSubmit={handleSaveNav} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 font-mono uppercase tracking-wider">Tên hiển thị (Label) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Giới thiệu, Khóa học..."
                    value={editingNav.label}
                    onChange={(e) => setEditingNav({ ...editingNav, label: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 font-mono uppercase tracking-wider">Đường dẫn liên kết (Link) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: #about hoặc /courses hoặc https://..."
                    value={editingNav.link}
                    onChange={(e) => setEditingNav({ ...editingNav, link: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 font-mono uppercase tracking-wider">Icon (Lucide)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Home, User..."
                      value={editingNav.icon || ''}
                      onChange={(e) => setEditingNav({ ...editingNav, icon: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 font-mono uppercase tracking-wider">Menu Cha</label>
                    <select
                      value={editingNav.parentId || ''}
                      onChange={(e) => setEditingNav({ ...editingNav, parentId: e.target.value || null })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Không có (Root) --</option>
                      {navList.filter(n => !n.parentId && n.id !== editingNav.id).map(n => (
                        <option key={n.id} value={n.id}>{n.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 font-mono uppercase tracking-wider">Hiển thị trên thiết bị</label>
                    <select
                      value={editingNav.deviceType || 'all'}
                      onChange={(e) => setEditingNav({ ...editingNav, deviceType: e.target.value as 'all' | 'desktop' | 'mobile' })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">Mọi thiết bị (Responsive)</option>
                      <option value="desktop">Chỉ trên Desktop</option>
                      <option value="mobile">Chỉ trên Mobile</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 font-mono uppercase tracking-wider">Mở liên kết</label>
                    <select
                      value={editingNav.target || '_self'}
                      onChange={(e) => setEditingNav({ ...editingNav, target: e.target.value as '_self' | '_blank' })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="_self">Tab hiện tại (_self)</option>
                      <option value="_blank">Tab mới (_blank)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">Mục nổi bật</span>
                    <input
                      type="checkbox"
                      checked={editingNav.isFeatured || false}
                      onChange={(e) => setEditingNav({ ...editingNav, isFeatured: e.target.checked })}
                      className="rounded text-emerald-500 w-4 h-4"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">Hiển thị menu</span>
                    <input
                      type="checkbox"
                      checked={editingNav.visible}
                      onChange={(e) => setEditingNav({ ...editingNav, visible: e.target.checked })}
                      className="rounded text-emerald-500 w-4 h-4"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingNav(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Lưu menu
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
`;

const navRegex = /\{\/\* SUB-VIEW 3: NAVIGATION MENU BUILDER PANEL \*\/\}[\s\S]*?\}\s*<\/div>\s*\)\s*\}\s*<\/div>\s*\);\s*}/;
content = content.replace(navRegex, navCode + '\n  // Helper safe field reader');

// Replace handleSaveNav and handleSortNav and handleDeleteNav
const actionsRegex = /\/\/ --- NAV ACTIONS ---[\s\S]*?\/\/ --- END NAV ACTIONS ---/;
const newActions = `// --- NAV ACTIONS ---
  const handleSaveNav = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNav) return;
    
    let updated = [...navList];
    const idx = updated.findIndex(item => item.id === editingNav.id);
    if (idx >= 0) {
      updated[idx] = editingNav;
    } else {
      updated.push(editingNav);
    }
    
    setNavList(updated);
    await savePortfolioNavigation(updated);
    setEditingNav(null);
    triggerSuccess('Lưu mục menu thành công!');
  };

  const handleDeleteNav = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục menu này?')) return;
    const updated = navList.filter(item => item.id !== id && item.parentId !== id); // Xóa luôn cả con nếu xóa cha
    setNavList(updated);
    await savePortfolioNavigation(updated);
    triggerSuccess('Đã xóa mục menu thành công!');
  };

  const handleSortNav = async (id: string, direction: 'up' | 'down') => {
    const item = navList.find(n => n.id === id);
    if (!item) return;
    
    // Sort logic within the same level (same parentId)
    const siblings = navList.filter(n => n.parentId === item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex(n => n.id === id);
    if (index === -1) return;
    
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    
    // Swap sortOrder
    const targetItem = siblings[targetIdx];
    const tempOrder = item.sortOrder;
    item.sortOrder = targetItem.sortOrder;
    targetItem.sortOrder = tempOrder;
    
    const updated = navList.map(n => {
      if (n.id === item.id) return item;
      if (n.id === targetItem.id) return targetItem;
      return n;
    });
    
    setNavList(updated);
    await savePortfolioNavigation(updated);
  };
  // --- END NAV ACTIONS ---`;

content = content.replace(/\/\/ --- NAV ACTIONS ---[\s\S]*?(?=\s*\/\/\s*Helper safe field reader|\s*return\s*\()/m, newActions + '\n\n');

fs.writeFileSync('src/components/cms/ResearchLecturesNavCMS.tsx', content);
