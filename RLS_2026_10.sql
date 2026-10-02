-- =====================================================================================
-- BẢO VỆ DỮ LIỆU THEO DÒNG (RLS) CHO EDUGO, THÁNG 10/2026
-- Chạy toàn bộ tệp trong Supabase > SQL Editor > Run. Chạy lại nhiều lần vẫn an toàn.
--
-- Nguyên tắc
-- 1. Người dùng đăng nhập bằng Firebase, Supabase nhận token nên auth.jwt()->>'sub' là Firebase uid.
-- 2. Dữ liệu của ai người đó thấy, cộng thêm người được thêm cộng tác (bảng collaborators).
--    Admin cũng chỉ thấy dữ liệu của mình (quy tắc dữ liệu cá nhân).
-- 3. Khách chưa đăng nhập chỉ thấy nội dung công khai. Sinh viên nộp bài, làm trắc nghiệm, xem bài
--    được giao đi qua các hàm RPC kiểm tra mã link và MSSV, không đọc thẳng bảng.
-- 4. Hàm SECURITY DEFINER thuộc chủ bảng nên không bị RLS chặn, dùng làm hàm kiểm tra quyền.
-- =====================================================================================

-- ---------- 0. Dọn dữ liệu cũ thiếu chủ (dự án định tính tạo trước khi có cột owner_id) ----------
update public.qda_projects    set owner_id = 'QDaOMwea6MV3XkFnv9uguv4M0Zr1' where owner_id is null;
update public.qda_documents   set owner_id = 'QDaOMwea6MV3XkFnv9uguv4M0Zr1' where owner_id is null;
update public.qda_codes       set owner_id = 'QDaOMwea6MV3XkFnv9uguv4M0Zr1' where owner_id is null;
update public.qda_annotations set owner_id = 'QDaOMwea6MV3XkFnv9uguv4M0Zr1' where owner_id is null;
update public.qda_memos       set owner_id = 'QDaOMwea6MV3XkFnv9uguv4M0Zr1' where owner_id is null;

-- ---------- 1. Hàm nền ----------
create or replace function public.rls_uid() returns text language sql stable
as $$ select nullif(coalesce(auth.jwt()->>'sub', ''), '') $$;

create or replace function public.is_top_admin() returns boolean language sql stable
as $$ select coalesce(public.rls_uid() = 'QDaOMwea6MV3XkFnv9uguv4M0Zr1', false) $$;

create or replace function public.my_username() returns text language sql stable security definer set search_path = public
as $$ select nullif(data->>'username', '') from public.portfolio_settings where key = 'profile:' || public.rls_uid() $$;

create or replace function public.collab_role(p_type text, p_id text) returns text language sql stable security definer set search_path = public
as $$ select role from public.collaborators where resource_type = p_type and resource_id = p_id and user_id = public.rls_uid() limit 1 $$;

-- Chủ thật của tài nguyên (không tin giá trị owner_id do trình duyệt gửi lên).
create or replace function public.resource_owner(p_type text, p_id text) returns text language plpgsql stable security definer set search_path = public as $$
declare o text;
begin
  case p_type
    when 'el_lesson'     then select owner_id into o from public.el_lessons where id::text = p_id;
    when 'bank_item'     then select owner_id into o from public.edu_assignment_bank where id::text = p_id;
    when 'quiz'          then select owner_id into o from public.quizzes where id::text = p_id;
    when 'quiz_question' then select owner_id into o from public.quiz_bank_questions where id::text = p_id;
    when 'edu_class'     then select owner_id into o from public.edu_classes where id::text = p_id;
    when 'edu_school'    then select owner_id into o from public.edu_schools where id::text = p_id;
    when 'qda_project'   then select owner_id into o from public.qda_projects where id::text = p_id;
    when 'slide_deck'    then select split_part(key, ':', 2) into o from public.portfolio_settings where key like 'deck:%' and split_part(key, ':', 3) = p_id limit 1;
    when 'quant_project' then select split_part(key, ':', 2) into o from public.portfolio_settings where key like 'quant:%' and split_part(key, ':', 3) = p_id limit 1;
    else o := null;
  end case;
  return o;
end $$;

-- Ai được thêm, bớt, đổi quyền người cộng tác của một tài nguyên.
create or replace function public.can_manage_resource(p_type text, p_id text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare u text := public.rls_uid(); o text; sid text;
begin
  if u is null then return false; end if;
  o := public.resource_owner(p_type, p_id);
  if o = u then return true; end if;
  if exists (select 1 from public.collaborators c where c.resource_type = p_type and c.resource_id = p_id and c.user_id = u
             and (c.role = 'manage' or coalesce((c.perms->>'manageMembers')::boolean, false))) then return true; end if;
  if p_type = 'edu_class' then
    select school_id::text into sid from public.edu_classes where id::text = p_id;
    if sid is not null and (exists (select 1 from public.edu_schools s where s.id::text = sid and s.owner_id = u)
       or exists (select 1 from public.collaborators c where c.resource_type = 'edu_school' and c.resource_id = sid and c.user_id = u
                  and (c.role = 'manage' or coalesce((c.perms->>'manageMembers')::boolean, false)))) then return true; end if;
  end if;
  return false;
end $$;

-- ---------- 2. Quyền theo từng nhóm dữ liệu ----------
-- Lớp, trường
create or replace function public.can_edu_class(p_id text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare u text := public.rls_uid(); c record;
begin
  if u is null or p_id is null then return false; end if;
  select id, owner_id, school_id into c from public.edu_classes where id::text = p_id;
  if not found then return false; end if;
  if c.owner_id = u or public.collab_role('edu_class', p_id) is not null then return true; end if;
  if c.school_id is not null and (exists (select 1 from public.edu_schools s where s.id = c.school_id and s.owner_id = u)
     or public.collab_role('edu_school', c.school_id::text) is not null) then return true; end if;
  return false;
end $$;

create or replace function public.can_edu_school(p_id text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare u text := public.rls_uid();
begin
  if u is null or p_id is null then return false; end if;
  if exists (select 1 from public.edu_schools s where s.id::text = p_id and s.owner_id = u) then return true; end if;
  if public.collab_role('edu_school', p_id) is not null then return true; end if;
  -- Người được giao 1 lớp trong trường vẫn đọc được tên trường.
  return exists (select 1 from public.edu_classes c where c.school_id::text = p_id and (c.owner_id = u or public.collab_role('edu_class', c.id::text) is not null));
end $$;

create or replace function public.can_edu_assignment(p_id text) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select public.can_edu_class(a.class_id::text) from public.edu_assignments a where a.id::text = p_id), false) $$;

create or replace function public.can_edu_grade_column(p_id text) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select public.can_edu_class(g.class_id::text) from public.edu_grade_columns g where g.id::text = p_id), false) $$;

-- Giáo trình (E-Learning)
create or replace function public.el_readable(p_id text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare u text := public.rls_uid(); l record;
begin
  select owner_id, is_public, status, deleted_at into l from public.el_lessons where id::text = p_id;
  if not found then return false; end if;
  if l.is_public and l.status = 'published' and l.deleted_at is null then return true; end if;
  if u is not null and (l.owner_id = u or public.collab_role('el_lesson', p_id) is not null) then return true; end if;
  -- Bài học trong khoá học trên website được phép xem nội dung giáo trình gắn kèm.
  begin
    if exists (select 1 from public.portfolio_course_lessons cl where cl.data->>'elLessonId' = p_id) then return true; end if;
  exception when others then null;
  end;
  return false;
end $$;

create or replace function public.el_writable(p_id text) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select l.owner_id = public.rls_uid() or public.collab_role('el_lesson', p_id) in ('edit', 'manage') from public.el_lessons l where l.id::text = p_id), false) $$;

-- Trắc nghiệm
create or replace function public.quiz_member(p_id text) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select q.owner_id = public.rls_uid() or public.collab_role('quiz', p_id) is not null from public.quizzes q where q.id::text = p_id), false) $$;

create or replace function public.quiz_readable(p_id text) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select q.is_public is true or q.owner_id = public.rls_uid() or public.collab_role('quiz', p_id) is not null from public.quizzes q where q.id::text = p_id), false) $$;

create or replace function public.quiz_writable(p_id text) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select q.owner_id = public.rls_uid() or public.collab_role('quiz', p_id) in ('edit', 'manage') from public.quizzes q where q.id::text = p_id), false) $$;

create or replace function public.attempt_quiz(p_id text) returns text language sql stable security definer set search_path = public
as $$ select quiz_id::text from public.quiz_attempts where id::text = p_id $$;

create or replace function public.question_readable(p_id text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select q.owner_id = public.rls_uid() or q.is_public is true or public.collab_role('quiz_question', p_id) is not null
    or exists (select 1 from public.quiz_items i where i.question_id::text = p_id and public.quiz_member(i.quiz_id::text))
    from public.quiz_bank_questions q where q.id::text = p_id), false) $$;

create or replace function public.question_writable(p_id text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select q.owner_id = public.rls_uid() or public.collab_role('quiz_question', p_id) in ('edit', 'manage')
    or exists (select 1 from public.quiz_items i where i.question_id::text = p_id and public.quiz_writable(i.quiz_id::text))
    from public.quiz_bank_questions q where q.id::text = p_id), false) $$;

-- Định tính
create or replace function public.can_qda(p_id text) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select p.owner_id = public.rls_uid() or public.collab_role('qda_project', p_id) is not null from public.qda_projects p where p.id::text = p_id), false) $$;

create or replace function public.can_qda_doc(p_id text) returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select public.can_qda(d.project_id::text) from public.qda_documents d where d.id::text = p_id), false) $$;

-- Cài đặt dạng khoá (portfolio_settings): ai đọc, ai ghi khoá nào.
create or replace function public.ps_can_read(p_key text) returns boolean language plpgsql stable security definer set search_path = public as $$
declare u text := public.rls_uid();
begin
  if p_key like 'notif_state:%' then return u is not null and p_key = 'notif_state:' || u; end if;
  if p_key like 'trash:%' then return u is not null and p_key like 'trash:' || u || ':%'; end if;
  if p_key like 'deck:%' then
    return u is not null and (split_part(p_key, ':', 2) = u or public.collab_role('slide_deck', split_part(p_key, ':', 3)) is not null);
  end if;
  if p_key like 'quant:%' then
    return u is not null and (split_part(p_key, ':', 2) = u or public.collab_role('quant_project', split_part(p_key, ':', 3)) is not null);
  end if;
  return true;
end $$;

-- Bài giảng đã bật "Đưa vào thư viện" thì mọi tài khoản đã đăng nhập đều xem được.
create or replace function public.ps_can_read(p_key text, p_data jsonb) returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  if p_key like 'deck:%' and coalesce((p_data->>'inLibrary')::boolean, false) and p_data->>'deletedAt' is null then
    return public.rls_uid() is not null;
  end if;
  return public.ps_can_read(p_key);
end $$;

create or replace function public.ps_can_write(p_key text, p_data jsonb) returns boolean language plpgsql stable security definer set search_path = public as $$
declare u text := public.rls_uid(); pre text;
begin
  if u is null then return false; end if;
  if p_key like 'notif_state:%' then return p_key = 'notif_state:' || u; end if;
  if p_key like 'trash:%' then return p_key like 'trash:' || u || ':%'; end if;
  if p_key like 'profile:%' then return p_key = 'profile:' || u; end if;
  if p_key like 'site_owner:%' then return p_key = 'site_owner:' || u; end if;
  if p_key like 'site:%' then return coalesce(p_data->>'owner', '') = u; end if;
  if p_key like 'deck:%' then
    return split_part(p_key, ':', 2) = u or public.collab_role('slide_deck', split_part(p_key, ':', 3)) in ('edit', 'manage');
  end if;
  if p_key like 'quant:%' then
    return split_part(p_key, ':', 2) = u or public.collab_role('quant_project', split_part(p_key, ':', 3)) in ('edit', 'manage');
  end if;
  if p_key like 'deck_share:%' then
    return coalesce(p_data->>'key', '') like 'deck:%' and (split_part(p_data->>'key', ':', 2) = u or public.collab_role('slide_deck', split_part(p_data->>'key', ':', 3)) in ('edit', 'manage'));
  end if;
  if p_key like 'edugo_%' then return true; end if;
  -- Khoá dạng <uid>:<tên> là trang web riêng của người đó.
  if position(':' in p_key) > 0 then
    pre := split_part(p_key, ':', 1);
    return pre = u;
  end if;
  -- Khoá không tiền tố là trang web cũ của quản trị viên chính.
  return public.is_top_admin();
end $$;

-- ---------- 3. Hàm cho sinh viên nộp bài qua link (không đăng nhập) ----------
create or replace function public.edu_pub_assignment(p_link text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.edu_assignments; c public.edu_classes; s public.edu_schools;
begin
  select * into a from public.edu_assignments where share_link_id = p_link;
  if not found then return null; end if;
  select * into c from public.edu_classes where id = a.class_id;
  if c.school_id is not null then select * into s from public.edu_schools where id = c.school_id; end if;
  return to_jsonb(a) || jsonb_build_object('edu_classes', to_jsonb(c) || jsonb_build_object('edu_schools', to_jsonb(s)));
end $$;

create or replace function public.edu_pub_student(p_link text, p_mssv text, p_assignment uuid default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.edu_assignments; t public.edu_assignments; u public.edu_users;
begin
  select * into a from public.edu_assignments where share_link_id = p_link;
  if not found then return null; end if;
  select * into u from public.edu_users where class_id = a.class_id and mssv = trim(p_mssv) limit 1;
  if not found then return jsonb_build_object('user', null); end if;
  if p_assignment is not null then
    select * into t from public.edu_assignments where id = p_assignment and class_id = a.class_id;
    if not found then return null; end if;
  else t := a; end if;
  return jsonb_build_object(
    'user', to_jsonb(u),
    'assignments', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from public.edu_assignments x where x.class_id = a.class_id), '[]'::jsonb),
    'submission', (select to_jsonb(sb) from public.edu_submissions sb where sb.assignment_id = t.id and sb.mssv = u.mssv limit 1),
    'columns', coalesce((select jsonb_agg(to_jsonb(g)) from public.edu_grade_columns g where g.class_id = a.class_id), '[]'::jsonb),
    'grades', coalesce((select jsonb_agg(to_jsonb(gr)) from public.edu_grades gr join public.edu_grade_columns g on g.id = gr.grade_column_id where g.class_id = a.class_id and gr.user_id = u.id), '[]'::jsonb),
    'extension', (select to_jsonb(e) from public.edu_extension_requests e where e.assignment_id = t.id and e.user_id = u.id order by e.created_at desc limit 1)
  );
end $$;

create or replace function public.edu_pub_submit(p_link text, p_mssv text, p_assignment uuid, p_files jsonb, p_content text) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.edu_assignments; t public.edu_assignments; u public.edu_users; sb public.edu_submissions;
begin
  select * into a from public.edu_assignments where share_link_id = p_link;
  if not found then raise exception 'Link nộp bài không còn.'; end if;
  select * into t from public.edu_assignments where id = coalesce(p_assignment, a.id) and class_id = a.class_id;
  if not found then raise exception 'Bài tập không thuộc lớp này.'; end if;
  select * into u from public.edu_users where class_id = a.class_id and mssv = trim(p_mssv) limit 1;
  if not found then raise exception 'MSSV không có trong lớp.'; end if;
  select * into sb from public.edu_submissions where assignment_id = t.id and mssv = u.mssv limit 1;
  if found then
    update public.edu_submissions set files = coalesce(p_files, '[]'::jsonb), content = p_content, user_id = u.id, submitted_at = now(), updated_at = now(),
      first_submitted_at = coalesce(first_submitted_at, now()) where id = sb.id returning * into sb;
  else
    insert into public.edu_submissions (assignment_id, user_id, mssv, files, content, submitted_at, updated_at, first_submitted_at)
    values (t.id, u.id, u.mssv, coalesce(p_files, '[]'::jsonb), p_content, now(), now(), now()) returning * into sb;
  end if;
  return to_jsonb(sb);
end $$;

create or replace function public.edu_pub_extension(p_link text, p_mssv text, p_assignment uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.edu_assignments; t public.edu_assignments; u public.edu_users; e public.edu_extension_requests;
begin
  select * into a from public.edu_assignments where share_link_id = p_link;
  if not found then raise exception 'Link nộp bài không còn.'; end if;
  select * into t from public.edu_assignments where id = coalesce(p_assignment, a.id) and class_id = a.class_id;
  if not found then raise exception 'Bài tập không thuộc lớp này.'; end if;
  select * into u from public.edu_users where class_id = a.class_id and mssv = trim(p_mssv) limit 1;
  if not found then raise exception 'MSSV không có trong lớp.'; end if;
  select * into e from public.edu_extension_requests where assignment_id = t.id and user_id = u.id order by created_at desc limit 1;
  if found and e.status = 'pending' then return to_jsonb(e); end if;
  insert into public.edu_extension_requests (assignment_id, class_id, user_id, mssv, student_name, status, created_at)
  values (t.id, t.class_id, u.id, u.mssv, u.full_name, 'pending', now()) returning * into e;
  return to_jsonb(e);
end $$;

-- Bài tập ngân hàng xem qua link chia sẻ /bt/<mã>
create or replace function public.edu_bank_by_token(p_token text) returns jsonb language sql stable security definer set search_path = public
as $$ select to_jsonb(b) from public.edu_assignment_bank b where b.share_token = p_token and coalesce(p_token, '') <> '' limit 1 $$;

-- Bài giảng trình chiếu xem qua link công khai (?deck=<mã>), chỉ khi chủ bật "Bất cứ ai có liên kết".
create or replace function public.deck_by_share(p_token text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare k text; r public.portfolio_settings;
begin
  select data->>'key' into k from public.portfolio_settings where key = 'deck_share:' || p_token;
  if k is null then return null; end if;
  select * into r from public.portfolio_settings where key = k;
  if not found or coalesce((r.data->>'shareOn')::boolean, false) = false or r.data->>'deletedAt' is not null then return null; end if;
  return jsonb_build_object('key', r.key, 'data', r.data);
end $$;

-- Danh sách trang chia sẻ cho bước build (ảnh xem trước khi gửi link lên mạng xã hội).
-- Chỉ trả tiêu đề, mô tả ngắn của nội dung đã có link chia sẻ, không trả dữ liệu cá nhân.
create or replace function public.share_catalog() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'subjects', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name) order by id) from public.edu_subjects), '[]'::jsonb),
    'bank', coalesce((select jsonb_agg(jsonb_build_object('share_token', share_token, 'title', title, 'content', left(content, 4000), 'subject_id', subject_id, 'owner_name', owner_name) order by share_token) from public.edu_assignment_bank where share_token is not null), '[]'::jsonb),
    'lessons', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'title', title, 'summary', summary, 'cover_url', cover_url, 'subject_id', subject_id, 'owner_name', owner_name, 'author_label', author_label, 'is_public', is_public, 'status', status, 'share_token', share_token) order by id) from public.el_lessons where deleted_at is null and ((is_public and status = 'published') or share_token is not null)), '[]'::jsonb),
    'quizzes', coalesce((select jsonb_agg(jsonb_build_object('slug', slug, 'title', title, 'description', description, 'subject_id', subject_id, 'owner_name', owner_name, 'duration_minutes', duration_minutes) order by slug) from public.quizzes where slug is not null), '[]'::jsonb),
    'assignments', coalesce((select jsonb_agg(jsonb_build_object('share_link_id', a.share_link_id, 'title', a.title, 'content', left(a.content, 4000), 'deadline', a.deadline, 'subject_id', a.subject_id, 'edu_classes', jsonb_build_object('name', c.name)) order by a.share_link_id) from public.edu_assignments a left join public.edu_classes c on c.id = a.class_id where a.share_link_id is not null), '[]'::jsonb)
  ) $$;

-- Tệp bài nộp cũ lưu trong cơ sở dữ liệu: chỉ giảng viên của lớp đó lấy được.
create or replace function public.edu_submission_file_url(p_submission uuid, p_index int)
returns text language sql stable security definer set search_path = public as $$
  select files->p_index->>'url' from public.edu_submissions where id = p_submission and public.can_edu_assignment(assignment_id::text);
$$;

grant execute on function public.edu_pub_assignment(text), public.edu_pub_student(text, text, uuid), public.edu_pub_submit(text, text, uuid, jsonb, text),
  public.edu_pub_extension(text, text, uuid), public.edu_bank_by_token(text), public.deck_by_share(text), public.share_catalog() to anon, authenticated;

-- Các hàm sinh viên, khách đang dùng phải chạy với quyền chủ bảng để không bị RLS chặn.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and not p.prosecdef
             and p.proname in ('quiz_open', 'quiz_start', 'quiz_save_answer', 'quiz_submit', 'quiz_log_event', 'el_public_lesson', 'el_log_view',
                               'el_copy_lesson', 'course_student_counts', 'edu_submission_file_url', 'get_storage_stats', 'log_bandwidth')
  loop
    execute format('alter function %s security definer set search_path = public', f.sig);
  end loop;
end $$;

-- ---------- 4. Bật RLS và đặt chính sách ----------
-- Ghi chú: lệnh upsert luôn bị kiểm tra theo chính sách INSERT kể cả khi thực chất là sửa dòng cũ,
-- nên chính sách INSERT cho phép thêm trường hợp người cộng tác đang có quyền sửa dòng đó.
-- Xoá chính sách cũ của các bảng sắp bật để không còn chính sách "ai cũng đọc được" sót lại.
do $$
declare t text; p record;
begin
  foreach t in array array['collaborators','edu_schools','edu_classes','edu_users','edu_grade_columns','edu_assignments','edu_submissions','edu_grades',
    'edu_extension_requests','edu_subjects','edu_assignment_bank','el_lessons','el_sections','el_resources','el_lesson_versions','el_lesson_classes',
    'el_section_views','quizzes','quiz_items','quiz_class_assignments','quiz_bank_questions','quiz_bank_options','quiz_attempts','quiz_attempt_answers',
    'quiz_proctor_logs','qda_projects','qda_documents','qda_codes','qda_annotations','qda_memos','remier_projects','remier_assets','media_items',
    'social_presets','tasks','system_notifications','portfolio_settings','portfolio_course_students']
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- Cộng tác
create policy collab_select on public.collaborators for select to authenticated
  using (user_id = rls_uid() or owner_id = rls_uid() or added_by = rls_uid() or collab_role(resource_type, resource_id) is not null or can_manage_resource(resource_type, resource_id));
create policy collab_insert on public.collaborators for insert to authenticated
  with check (can_manage_resource(resource_type, resource_id)
    or (resource_type not in ('el_lesson','bank_item','quiz','quiz_question','edu_class','edu_school','qda_project','slide_deck','quant_project') and owner_id = rls_uid()));
create policy collab_update on public.collaborators for update to authenticated
  using (can_manage_resource(resource_type, resource_id) or owner_id = rls_uid()) with check (can_manage_resource(resource_type, resource_id) or owner_id = rls_uid());
create policy collab_delete on public.collaborators for delete to authenticated
  using (can_manage_resource(resource_type, resource_id) or owner_id = rls_uid() or user_id = rls_uid());

-- Trường, lớp, sinh viên, bài tập, bài nộp, điểm, gia hạn
create policy sch_select on public.edu_schools for select to authenticated using (can_edu_school(id::text));
create policy sch_insert on public.edu_schools for insert to authenticated with check (owner_id = rls_uid() or can_edu_school(id::text));
create policy sch_update on public.edu_schools for update to authenticated using (can_edu_school(id::text)) with check (can_edu_school(id::text) or owner_id = rls_uid());
create policy sch_delete on public.edu_schools for delete to authenticated using (owner_id = rls_uid());

create policy cls_select on public.edu_classes for select to authenticated using (can_edu_class(id::text));
create policy cls_insert on public.edu_classes for insert to authenticated with check ((owner_id = rls_uid() and (school_id is null or can_edu_school(school_id::text))) or can_edu_class(id::text));
create policy cls_update on public.edu_classes for update to authenticated using (can_edu_class(id::text)) with check (can_edu_class(id::text) or owner_id = rls_uid());
create policy cls_delete on public.edu_classes for delete to authenticated
  using (owner_id = rls_uid() or exists (select 1 from public.edu_schools s where s.id = school_id and s.owner_id = rls_uid()));

create policy eus_all on public.edu_users for all to authenticated using (can_edu_class(class_id::text)) with check (can_edu_class(class_id::text));
create policy egc_all on public.edu_grade_columns for all to authenticated using (can_edu_class(class_id::text)) with check (can_edu_class(class_id::text));
create policy eas_all on public.edu_assignments for all to authenticated using (can_edu_class(class_id::text)) with check (can_edu_class(class_id::text));
create policy eex_all on public.edu_extension_requests for all to authenticated using (can_edu_class(class_id::text)) with check (can_edu_class(class_id::text));
create policy esb_all on public.edu_submissions for all to authenticated using (can_edu_assignment(assignment_id::text)) with check (can_edu_assignment(assignment_id::text));
create policy egr_all on public.edu_grades for all to authenticated using (can_edu_grade_column(grade_column_id::text)) with check (can_edu_grade_column(grade_column_id::text));

-- Môn học: tên môn không phải dữ liệu riêng tư, ai cũng đọc được (trang in PDF của sinh viên cần).
create policy sub_select on public.edu_subjects for select to anon, authenticated using (true);
create policy sub_insert on public.edu_subjects for insert to authenticated with check (owner_id = rls_uid() or is_top_admin());
create policy sub_update on public.edu_subjects for update to authenticated using (owner_id = rls_uid() or is_top_admin()) with check (owner_id = rls_uid() or is_top_admin());
create policy sub_delete on public.edu_subjects for delete to authenticated using (owner_id = rls_uid() or is_top_admin());

-- Ngân hàng bài tập
create policy bank_select on public.edu_assignment_bank for select to authenticated
  using (owner_id = rls_uid() or is_public is true or collab_role('bank_item', id::text) is not null);
create policy bank_insert on public.edu_assignment_bank for insert to authenticated with check (owner_id = rls_uid() or collab_role('bank_item', id::text) in ('edit','manage') or is_top_admin());
create policy bank_update on public.edu_assignment_bank for update to authenticated
  using (owner_id = rls_uid() or collab_role('bank_item', id::text) in ('edit','manage') or (is_top_admin() and is_public is true))
  with check (owner_id = rls_uid() or collab_role('bank_item', id::text) in ('edit','manage') or is_top_admin());
create policy bank_delete on public.edu_assignment_bank for delete to authenticated using (owner_id = rls_uid());

-- Giáo trình
create policy el_select on public.el_lessons for select to anon, authenticated using (el_readable(id::text));
create policy el_insert on public.el_lessons for insert to authenticated with check (owner_id = rls_uid() or el_writable(id::text) or is_top_admin());
create policy el_update on public.el_lessons for update to authenticated
  using (el_writable(id::text) or (is_top_admin() and is_public is true)) with check (el_writable(id::text) or is_top_admin() or owner_id = rls_uid());
create policy el_delete on public.el_lessons for delete to authenticated using (owner_id = rls_uid());
create policy els_select on public.el_sections for select to anon, authenticated using (el_readable(lesson_id::text));
create policy els_write on public.el_sections for all to authenticated using (el_writable(lesson_id::text)) with check (el_writable(lesson_id::text));
create policy elr_select on public.el_resources for select to anon, authenticated using (el_readable(lesson_id::text));
create policy elr_write on public.el_resources for all to authenticated using (el_writable(lesson_id::text)) with check (el_writable(lesson_id::text));
create policy elv_all on public.el_lesson_versions for all to authenticated using (el_writable(lesson_id::text)) with check (el_writable(lesson_id::text));
create policy elc_all on public.el_lesson_classes for all to authenticated using (el_writable(lesson_id::text)) with check (el_writable(lesson_id::text));
create policy elw_all on public.el_section_views for all to authenticated using (el_writable(lesson_id::text)) with check (el_writable(lesson_id::text));

-- Trắc nghiệm (sinh viên làm bài qua hàm RPC, không đọc thẳng các bảng này)
create policy qz_select on public.quizzes for select to authenticated using (quiz_readable(id::text));
create policy qz_insert on public.quizzes for insert to authenticated with check (owner_id = rls_uid() or quiz_writable(id::text));
create policy qz_update on public.quizzes for update to authenticated using (quiz_writable(id::text)) with check (quiz_writable(id::text) or owner_id = rls_uid());
create policy qz_delete on public.quizzes for delete to authenticated using (owner_id = rls_uid());
create policy qi_select on public.quiz_items for select to authenticated using (quiz_readable(quiz_id::text));
create policy qi_write on public.quiz_items for all to authenticated using (quiz_writable(quiz_id::text)) with check (quiz_writable(quiz_id::text));
create policy qca_select on public.quiz_class_assignments for select to authenticated using (quiz_member(quiz_id::text));
create policy qca_write on public.quiz_class_assignments for all to authenticated using (quiz_writable(quiz_id::text)) with check (quiz_writable(quiz_id::text));
create policy qat_select on public.quiz_attempts for select to authenticated using (quiz_member(quiz_id::text));
create policy qat_write on public.quiz_attempts for all to authenticated using (quiz_writable(quiz_id::text)) with check (quiz_writable(quiz_id::text));
create policy qaa_select on public.quiz_attempt_answers for select to authenticated using (quiz_member(attempt_quiz(attempt_id::text)));
create policy qaa_write on public.quiz_attempt_answers for all to authenticated using (quiz_writable(attempt_quiz(attempt_id::text))) with check (quiz_writable(attempt_quiz(attempt_id::text)));
create policy qpl_select on public.quiz_proctor_logs for select to authenticated using (quiz_member(attempt_quiz(attempt_id::text)));
create policy qpl_write on public.quiz_proctor_logs for all to authenticated using (quiz_writable(attempt_quiz(attempt_id::text))) with check (quiz_writable(attempt_quiz(attempt_id::text)));
create policy qbq_select on public.quiz_bank_questions for select to authenticated using (question_readable(id::text));
create policy qbq_insert on public.quiz_bank_questions for insert to authenticated with check (owner_id = rls_uid() or question_writable(id::text));
create policy qbq_update on public.quiz_bank_questions for update to authenticated using (question_writable(id::text)) with check (question_writable(id::text) or owner_id = rls_uid());
create policy qbq_delete on public.quiz_bank_questions for delete to authenticated using (owner_id = rls_uid());
create policy qbo_select on public.quiz_bank_options for select to authenticated using (question_readable(question_id::text));
create policy qbo_write on public.quiz_bank_options for all to authenticated using (question_writable(question_id::text)) with check (question_writable(question_id::text));

-- Định tính
create policy qdp_select on public.qda_projects for select to authenticated using (can_qda(id::text));
create policy qdp_insert on public.qda_projects for insert to authenticated with check (owner_id = rls_uid() or can_qda(id::text));
create policy qdp_update on public.qda_projects for update to authenticated using (can_qda(id::text)) with check (can_qda(id::text) or owner_id = rls_uid());
create policy qdp_delete on public.qda_projects for delete to authenticated using (owner_id = rls_uid());
create policy qdd_all on public.qda_documents for all to authenticated using (can_qda(project_id::text)) with check (can_qda(project_id::text));
create policy qdc_all on public.qda_codes for all to authenticated using (can_qda(project_id::text)) with check (can_qda(project_id::text));
create policy qdm_all on public.qda_memos for all to authenticated using (can_qda(project_id::text)) with check (can_qda(project_id::text));
create policy qdn_all on public.qda_annotations for all to authenticated using (owner_id = rls_uid() or can_qda_doc(doc_id::text)) with check (owner_id = rls_uid() or can_qda_doc(doc_id::text));

-- Dựng phim Remier, kho tệp, mẫu mạng xã hội
create policy rmp_all on public.remier_projects for all to authenticated using (owner_id = rls_uid()) with check (owner_id = rls_uid());
create policy rma_select on public.remier_assets for select to authenticated using (scope = 'shared' or owner_id = rls_uid());
create policy rma_write on public.remier_assets for all to authenticated using (scope = 'shared' or owner_id = rls_uid()) with check (scope = 'shared' or owner_id = rls_uid());
create policy mi_all on public.media_items for all to authenticated using (owner_id = rls_uid()) with check (owner_id = rls_uid());
create policy sp_all on public.social_presets for all to authenticated using (user_id = rls_uid()) with check (user_id = rls_uid());

-- Công việc: người tạo và người được giao
create policy task_select on public.tasks for select to authenticated
  using (rls_uid() in (creator_id, created_by, assigned_to) or (my_username() is not null and my_username() in (assigned_to, created_by)));
create policy task_insert on public.tasks for insert to authenticated
  with check (rls_uid() in (creator_id, created_by, assigned_to) or (my_username() is not null and my_username() in (assigned_to, created_by)));
create policy task_update on public.tasks for update to authenticated
  using (rls_uid() in (creator_id, created_by, assigned_to) or (my_username() is not null and my_username() in (assigned_to, created_by)))
  with check (rls_uid() in (creator_id, created_by, assigned_to) or (my_username() is not null and my_username() in (assigned_to, created_by)));
create policy task_delete on public.tasks for delete to authenticated using (rls_uid() in (creator_id, created_by));

-- Thông báo: gửi cho mọi người, cho mình, hoặc do mình gửi
create policy ntf_select on public.system_notifications for select to authenticated
  using (target_audience in ('all', 'all_admins') or sender_id = rls_uid()
         or coalesce(target_user_ids::jsonb ? rls_uid(), false) or (my_username() is not null and coalesce(target_user_ids::jsonb ? my_username(), false)));
create policy ntf_insert on public.system_notifications for insert to authenticated with check (coalesce(sender_id, '') in ('', rls_uid()));
create policy ntf_update on public.system_notifications for update to authenticated using (sender_id = rls_uid()) with check (sender_id = rls_uid());
create policy ntf_delete on public.system_notifications for delete to authenticated using (sender_id = rls_uid());

-- Cài đặt dạng khoá
create policy ps_select on public.portfolio_settings for select to anon, authenticated using (ps_can_read(key, data));
create policy ps_insert on public.portfolio_settings for insert to authenticated with check (ps_can_write(key, data));
create policy ps_update on public.portfolio_settings for update to authenticated using (ps_can_write(key, data)) with check (ps_can_write(key, data));
create policy ps_delete on public.portfolio_settings for delete to authenticated using (ps_can_write(key, data));

-- Học viên khoá học: mỗi người thấy đăng ký của mình, quản trị viên chính quản lý tất cả
create policy pcs_select on public.portfolio_course_students for select to authenticated
  using (user_id = rls_uid() or data->>'accountId' = rls_uid() or is_top_admin());
create policy pcs_write on public.portfolio_course_students for all to authenticated
  using (user_id = rls_uid() or data->>'accountId' = rls_uid() or is_top_admin())
  with check (user_id = rls_uid() or data->>'accountId' = rls_uid() or is_top_admin());

-- Token Firebase không có claim role nên Supabase chạy truy vấn với vai trò anon (vẫn đọc được sub).
-- Vì vậy mọi chính sách dành cho người đã đăng nhập được mở cho cả anon nhưng bắt buộc phải có uid.
do $$
declare p record; s text;
begin
  for p in select * from pg_policies where schemaname = 'public' and roles = array['authenticated']::name[]
           and tablename = any (array['collaborators','edu_schools','edu_classes','edu_users','edu_grade_columns','edu_assignments','edu_submissions','edu_grades',
             'edu_extension_requests','edu_subjects','edu_assignment_bank','el_lessons','el_sections','el_resources','el_lesson_versions','el_lesson_classes',
             'el_section_views','quizzes','quiz_items','quiz_class_assignments','quiz_bank_questions','quiz_bank_options','quiz_attempts','quiz_attempt_answers',
             'quiz_proctor_logs','qda_projects','qda_documents','qda_codes','qda_annotations','qda_memos','remier_projects','remier_assets','media_items',
             'social_presets','tasks','system_notifications','portfolio_settings','portfolio_course_students'])
  loop
    s := format('alter policy %I on public.%I to anon, authenticated', p.policyname, p.tablename);
    if p.qual is not null then s := s || format(' using (public.rls_uid() is not null and (%s))', p.qual); end if;
    if p.with_check is not null then s := s || format(' with check (public.rls_uid() is not null and (%s))', p.with_check); end if;
    execute s;
  end loop;
end $$;

-- Thêm mới rồi đọc lại ngay (insert ... returning): hàm kiểm tra quyền chưa thấy dòng vừa thêm,
-- nên chính sách đọc phải xét thẳng cột chủ sở hữu trước.
alter policy sch_select on public.edu_schools using (public.rls_uid() is not null and (owner_id = public.rls_uid() or public.can_edu_school(id::text)));
alter policy cls_select on public.edu_classes using (public.rls_uid() is not null and (owner_id = public.rls_uid() or public.can_edu_class(id::text)));
alter policy el_select on public.el_lessons using (owner_id = public.rls_uid() or public.el_readable(id::text));
alter policy qz_select on public.quizzes using (public.rls_uid() is not null and (owner_id = public.rls_uid() or public.quiz_readable(id::text)));
alter policy qbq_select on public.quiz_bank_questions using (public.rls_uid() is not null and (owner_id = public.rls_uid() or public.question_readable(id::text)));
alter policy qdp_select on public.qda_projects using (public.rls_uid() is not null and (owner_id = public.rls_uid() or public.can_qda(id::text)));

-- Báo PostgREST nạp lại cấu trúc mới.
notify pgrst, 'reload schema';

-- Kiểm tra nhanh sau khi chạy (khách chưa đăng nhập phải ra 0):
-- select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1;
