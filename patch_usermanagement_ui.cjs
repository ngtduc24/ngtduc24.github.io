const fs = require('fs');
let code = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');

const uiHtml = `
                    <div className="col-span-2 mt-4 space-y-4 border-t border-slate-200 pt-4">
                      <h4 className="text-[11px] font-bold text-slate-700">PHÂN QUYỀN CHUYÊN SÂU (CHI TIẾT)</h4>
                      
                      {editPermissions.includes('tasks') && (
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase">Dự án & Công việc</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'canCreateTask', label: 'Tạo nhiệm vụ' },
                              { key: 'canAssignTask', label: 'Giao nhiệm vụ' },
                              { key: 'canReceiveTask', label: 'Nhận nhiệm vụ' },
                              { key: 'canRunPauseTask', label: 'Bắt đầu/Tạm dừng' },
                              { key: 'canCompleteTask', label: 'Hoàn thành nhiệm vụ' },
                              { key: 'canDeleteTask', label: 'Xóa nhiệm vụ' }
                            ].map(p => (
                              <label key={p.key} className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-600">
                                <input type="checkbox" checked={!!editDetailedPerms[p.key as keyof UserAccount]} onChange={(e) => setEditDetailedPerms({ ...editDetailedPerms, [p.key]: e.target.checked })} className="rounded text-[#4c1d95] focus:ring-[#4c1d95]/20" /> {p.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {editPermissions.includes('scientific_journals') && (
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase">Điểm báo khoa học</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'canCreateJournal', label: 'Thêm bài báo' },
                              { key: 'canEditJournal', label: 'Chỉnh sửa' },
                              { key: 'canDeleteJournal', label: 'Xóa' },
                              { key: 'canImportJournal', label: 'Import dữ liệu' },
                              { key: 'canManageJournalCats', label: 'Quản lý danh mục' },
                              { key: 'canManageJournalSettings', label: 'Cài đặt điểm báo' }
                            ].map(p => (
                              <label key={p.key} className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-600">
                                <input type="checkbox" checked={!!editDetailedPerms[p.key as keyof UserAccount]} onChange={(e) => setEditDetailedPerms({ ...editDetailedPerms, [p.key]: e.target.checked })} className="rounded text-[#4c1d95] focus:ring-[#4c1d95]/20" /> {p.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {editPermissions.includes('qualitative_analysis') && (
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase">Phân tích định tính</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'canCreateQualitative', label: 'Tạo dự án mới' },
                              { key: 'canEditQualitative', label: 'Chỉnh sửa' },
                              { key: 'canDeleteQualitative', label: 'Xóa' },
                              { key: 'canImportQualitative', label: 'Import dữ liệu' },
                              { key: 'canExportQualitative', label: 'Export dữ liệu' },
                              { key: 'canManageQualitativeSettings', label: 'Cài đặt' }
                            ].map(p => (
                              <label key={p.key} className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-600">
                                <input type="checkbox" checked={!!editDetailedPerms[p.key as keyof UserAccount]} onChange={(e) => setEditDetailedPerms({ ...editDetailedPerms, [p.key]: e.target.checked })} className="rounded text-[#4c1d95] focus:ring-[#4c1d95]/20" /> {p.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {editPermissions.includes('quantitative_analysis') && (
                        <div className="space-y-2">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase">Phân tích định lượng</h5>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'canCreateQuantitative', label: 'Tạo dự án mới' },
                              { key: 'canEditQuantitative', label: 'Chỉnh sửa' },
                              { key: 'canDeleteQuantitative', label: 'Xóa' },
                              { key: 'canImportQuantitative', label: 'Import dữ liệu' },
                              { key: 'canExportQuantitative', label: 'Export dữ liệu' },
                              { key: 'canManageQuantitativeSettings', label: 'Cài đặt' }
                            ].map(p => (
                              <label key={p.key} className="flex items-center gap-2 cursor-pointer text-[10px] text-slate-600">
                                <input type="checkbox" checked={!!editDetailedPerms[p.key as keyof UserAccount]} onChange={(e) => setEditDetailedPerms({ ...editDetailedPerms, [p.key]: e.target.checked })} className="rounded text-[#4c1d95] focus:ring-[#4c1d95]/20" /> {p.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>`;

code = code.replace(
  /<span>Quản lý cài đặt<\/span>\n\s*<\/label>\n\s*<\/div>/,
  `<span>Quản lý cài đặt</span>
                    </label>
                    ${uiHtml}
                  </div>`
);

fs.writeFileSync('src/components/UserManagement.tsx', code);
