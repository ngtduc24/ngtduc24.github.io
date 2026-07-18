const fs = require('fs');
let code = fs.readFileSync('src/lib/data.ts', 'utf8');

code = code.replace(
  /export async function getUsers\(\): Promise<UserAccount\[\]> \{/,
  `export function mapUserFromDB(u: any): UserAccount {
  return {
    id: u.id,
    username: u.username,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    permissions: u.permissions || [],
    canAssignTask: u.can_assign_task,
    canReceiveTask: u.can_receive_task,
    canRunPauseTask: u.can_run_pause_task,
    canCompleteTask: u.can_complete_task,
    canDeleteTask: u.can_delete_task,
    canCreateTask: u.can_create_task,
    canManageSettings: u.can_manage_settings,
    canCreateJournal: u.can_create_journal,
    canEditJournal: u.can_edit_journal,
    canDeleteJournal: u.can_delete_journal,
    canImportJournal: u.can_import_journal,
    canManageJournalCats: u.can_manage_journal_cats,
    canManageJournalSettings: u.can_manage_journal_settings,
    canCreateQualitative: u.can_create_qualitative,
    canEditQualitative: u.can_edit_qualitative,
    canDeleteQualitative: u.can_delete_qualitative,
    canImportQualitative: u.can_import_qualitative,
    canExportQualitative: u.can_export_qualitative,
    canManageQualitativeSettings: u.can_manage_qualitative_settings,
    canCreateQuantitative: u.can_create_quantitative,
    canEditQuantitative: u.can_edit_quantitative,
    canDeleteQuantitative: u.can_delete_quantitative,
    canImportQuantitative: u.can_import_quantitative,
    canExportQuantitative: u.can_export_quantitative,
    canManageQuantitativeSettings: u.can_manage_quantitative_settings,
    createdAt: u.created_at,
    password: u.password
  } as UserAccount;
}

export async function getUsers(): Promise<UserAccount[]> {`
);

code = code.replace(
  /return snapshot\.docs\.map\(docSnap => \{\n\s*const u = docSnap\.data\(\);\n\s*return \{\n[\s\S]*?\} as UserAccount;\n\s*\}\);/,
  `return snapshot.docs.map(docSnap => mapUserFromDB(docSnap.data()));`
);

fs.writeFileSync('src/lib/data.ts', code);
