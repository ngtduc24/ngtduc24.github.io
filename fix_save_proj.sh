sed -i 's/const handleSaveProj = async (e: React.FormEvent) => {/const handleSaveProj = async (requestedStatus: "published" | "draft" | string) => {/g' src/components/cms/ProjectsCoursesCMS.tsx
sed -i "s/    e.preventDefault();/    /g" src/components/cms/ProjectsCoursesCMS.tsx
sed -i "s/    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;/    /g" src/components/cms/ProjectsCoursesCMS.tsx
sed -i "s/    const requestedStatus = submitter?.value === 'published'/    requestedStatus = requestedStatus === 'published' ? 'published' : requestedStatus === 'draft' ? 'draft' : editingProj.status; \/\//g" src/components/cms/ProjectsCoursesCMS.tsx
