const fs = require('fs');
let code = fs.readFileSync('src/components/UserManagement.tsx', 'utf8');

// Add editDetailedPerms state
code = code.replace(
  /const \[editCanManageSettings, setEditCanManageSettings\] = useState\(false\);/,
  `const [editCanManageSettings, setEditCanManageSettings] = useState(false);
  const [editDetailedPerms, setEditDetailedPerms] = useState<Partial<UserAccount>>({});`
);

// Populate editDetailedPerms on edit
code = code.replace(
  /setEditCanManageSettings\(\!\!user\.canManageSettings\);/,
  `setEditCanManageSettings(!!user.canManageSettings);
                            setEditDetailedPerms({
                              canAssignTask: user.canAssignTask,
                              canReceiveTask: user.canReceiveTask,
                              canRunPauseTask: user.canRunPauseTask,
                              canCompleteTask: user.canCompleteTask,
                              canDeleteTask: user.canDeleteTask,
                              canCreateTask: user.canCreateTask,
                              canCreateJournal: user.canCreateJournal,
                              canEditJournal: user.canEditJournal,
                              canDeleteJournal: user.canDeleteJournal,
                              canImportJournal: user.canImportJournal,
                              canManageJournalCats: user.canManageJournalCats,
                              canManageJournalSettings: user.canManageJournalSettings,
                              canCreateQualitative: user.canCreateQualitative,
                              canEditQualitative: user.canEditQualitative,
                              canDeleteQualitative: user.canDeleteQualitative,
                              canImportQualitative: user.canImportQualitative,
                              canExportQualitative: user.canExportQualitative,
                              canManageQualitativeSettings: user.canManageQualitativeSettings,
                              canCreateQuantitative: user.canCreateQuantitative,
                              canEditQuantitative: user.canEditQuantitative,
                              canDeleteQuantitative: user.canDeleteQuantitative,
                              canImportQuantitative: user.canImportQuantitative,
                              canExportQuantitative: user.canExportQuantitative,
                              canManageQuantitativeSettings: user.canManageQuantitativeSettings
                            });`
);

// Update handleEditUserSubmit
code = code.replace(
  /canAssignTask: editRole === 'admin' \? true : \(editingUser\.canAssignTask \|\| false\),([\s\S]*?)canManageQuantitativeSettings: editRole === 'admin' \? true : \(editingUser\.canManageQuantitativeSettings \|\| false\),/,
  `canAssignTask: editRole === 'admin' ? true : (editDetailedPerms.canAssignTask || false),
      canReceiveTask: editRole === 'admin' ? true : (editDetailedPerms.canReceiveTask || false),
      canRunPauseTask: editRole === 'admin' ? true : (editDetailedPerms.canRunPauseTask || false),
      canCompleteTask: editRole === 'admin' ? true : (editDetailedPerms.canCompleteTask || false),
      canDeleteTask: editRole === 'admin' ? true : (editDetailedPerms.canDeleteTask || false),
      canCreateTask: editRole === 'admin' ? true : (editDetailedPerms.canCreateTask || false),
      canManageSettings: editRole === 'admin' ? true : editCanManageSettings,
      canCreateJournal: editRole === 'admin' ? true : (editDetailedPerms.canCreateJournal || false),
      canEditJournal: editRole === 'admin' ? true : (editDetailedPerms.canEditJournal || false),
      canDeleteJournal: editRole === 'admin' ? true : (editDetailedPerms.canDeleteJournal || false),
      canImportJournal: editRole === 'admin' ? true : (editDetailedPerms.canImportJournal || false),
      canManageJournalCats: editRole === 'admin' ? true : (editDetailedPerms.canManageJournalCats || false),
      canManageJournalSettings: editRole === 'admin' ? true : (editDetailedPerms.canManageJournalSettings || false),
      canCreateQualitative: editRole === 'admin' ? true : (editDetailedPerms.canCreateQualitative || false),
      canEditQualitative: editRole === 'admin' ? true : (editDetailedPerms.canEditQualitative || false),
      canDeleteQualitative: editRole === 'admin' ? true : (editDetailedPerms.canDeleteQualitative || false),
      canImportQualitative: editRole === 'admin' ? true : (editDetailedPerms.canImportQualitative || false),
      canExportQualitative: editRole === 'admin' ? true : (editDetailedPerms.canExportQualitative || false),
      canManageQualitativeSettings: editRole === 'admin' ? true : (editDetailedPerms.canManageQualitativeSettings || false),
      canCreateQuantitative: editRole === 'admin' ? true : (editDetailedPerms.canCreateQuantitative || false),
      canEditQuantitative: editRole === 'admin' ? true : (editDetailedPerms.canEditQuantitative || false),
      canDeleteQuantitative: editRole === 'admin' ? true : (editDetailedPerms.canDeleteQuantitative || false),
      canImportQuantitative: editRole === 'admin' ? true : (editDetailedPerms.canImportQuantitative || false),
      canExportQuantitative: editRole === 'admin' ? true : (editDetailedPerms.canExportQuantitative || false),
      canManageQuantitativeSettings: editRole === 'admin' ? true : (editDetailedPerms.canManageQuantitativeSettings || false),`
);

fs.writeFileSync('src/components/UserManagement.tsx', code);
