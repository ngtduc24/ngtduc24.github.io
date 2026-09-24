-- Đề trắc nghiệm gắn vào khoá học công khai: cho phép người học ngoài lớp (học viên khoá học) làm bài.
-- Cột open_access = true nghĩa là đề nhận mọi mã người học kèm tên, không cần thuộc lớp được giao.
-- Chạy trong Supabase SQL Editor (Run without RLS).
alter table public.quizzes add column if not exists open_access boolean not null default false;
alter table public.quiz_attempts alter column student_id drop not null;
alter table public.quiz_attempts alter column class_id drop not null;
alter table public.quiz_attempts add column if not exists course_id text;
alter table public.quiz_attempts add column if not exists lesson_id text;

-- Xoá bản cũ để không bị trùng tên hàm (PostgREST không chọn được giữa 2 bản)
drop function if exists public.quiz_open(text, text);
drop function if exists public.quiz_start(text, text, text);

create or replace function public.quiz_open(p_slug text, p_student_code text, p_student_name text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_quiz public.quizzes; v_student record; v_used int; v_nq int; v_total numeric; v_name text; v_class uuid;
begin
  select * into v_quiz from public.quizzes where slug = p_slug and status = 'published';
  if not found then return jsonb_build_object('ok', false, 'error', 'Không tìm thấy đề'); end if;
  if v_quiz.open_at is not null and now() < v_quiz.open_at then
    return jsonb_build_object('ok', false, 'error', 'Đề chưa mở'); end if;
  if v_quiz.close_at is not null and now() > v_quiz.close_at then
    return jsonb_build_object('ok', false, 'error', 'Đề đã đóng'); end if;

  select u.id, u.full_name, u.class_id into v_student
  from public.edu_users u
  join public.quiz_class_assignments a on a.class_id = u.class_id
  where a.quiz_id = v_quiz.id and lower(u.mssv) = lower(trim(p_student_code))
  limit 1;
  if found then
    v_name := v_student.full_name; v_class := v_student.class_id;
  elsif v_quiz.open_access and coalesce(trim(p_student_code), '') <> '' then
    v_name := coalesce(nullif(trim(p_student_name), ''), trim(p_student_code)); v_class := null;
  else
    return jsonb_build_object('ok', false, 'error', 'MSSV không thuộc lớp được giao đề'); end if;

  select count(*), coalesce(sum(points),0) into v_nq, v_total
  from public.quiz_items where quiz_id = v_quiz.id;

  select count(*) into v_used from public.quiz_attempts
  where quiz_id = v_quiz.id and student_code = trim(p_student_code) and status <> 'voided';

  return jsonb_build_object(
    'ok', true,
    'quiz', jsonb_build_object('title', v_quiz.title, 'duration', v_quiz.duration_minutes,
              'max_attempts', v_quiz.max_attempts, 'fullscreen', v_quiz.proctor_fullscreen,
              'num_questions', coalesce(v_quiz.random_pick_count, v_nq), 'total_points', v_total),
    'student', jsonb_build_object('name', v_name, 'class_id', v_class),
    'attempts_used', v_used,
    'can_start', v_used < v_quiz.max_attempts);
end $function$;

create or replace function public.quiz_start(p_slug text, p_student_code text, p_ua text default null, p_student_name text default null, p_course_id text default null, p_lesson_id text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_quiz public.quizzes; v_student record; v_used int;
        v_attempt uuid; v_order uuid[]; v_total numeric; v_name text; v_class uuid; v_sid uuid;
begin
  select * into v_quiz from public.quizzes where slug = p_slug and status = 'published';
  if not found then return jsonb_build_object('ok', false, 'error', 'Không tìm thấy đề'); end if;
  if (v_quiz.open_at is not null and now() < v_quiz.open_at)
     or (v_quiz.close_at is not null and now() > v_quiz.close_at) then
    return jsonb_build_object('ok', false, 'error', 'Ngoài thời gian làm bài'); end if;

  select u.id, u.full_name, u.class_id into v_student
  from public.edu_users u
  join public.quiz_class_assignments a on a.class_id = u.class_id
  where a.quiz_id = v_quiz.id and lower(u.mssv) = lower(trim(p_student_code)) limit 1;
  if found then
    v_name := v_student.full_name; v_class := v_student.class_id; v_sid := v_student.id;
  elsif v_quiz.open_access and coalesce(trim(p_student_code), '') <> '' then
    v_name := coalesce(nullif(trim(p_student_name), ''), trim(p_student_code)); v_class := null; v_sid := null;
  else
    return jsonb_build_object('ok', false, 'error', 'MSSV không hợp lệ'); end if;

  select count(*) into v_used from public.quiz_attempts
  where quiz_id = v_quiz.id and student_code = trim(p_student_code) and status <> 'voided';
  if v_used >= v_quiz.max_attempts then
    return jsonb_build_object('ok', false, 'error', 'Đã hết số lần làm bài'); end if;

  select array_agg(id order by case when v_quiz.shuffle_questions then random() else order_index end)
  into v_order from public.quiz_items where quiz_id = v_quiz.id;
  if v_quiz.random_pick_count is not null then
    v_order := v_order[1:v_quiz.random_pick_count]; end if;

  select coalesce(sum(points),0) into v_total
  from public.quiz_items where id = any(v_order);

  insert into public.quiz_attempts
    (quiz_id, class_id, student_id, student_code, student_name, attempt_no,
     question_order, max_score, user_agent, course_id, lesson_id)
  values (v_quiz.id, v_class, v_sid, trim(p_student_code),
          v_name, v_used + 1, v_order, v_total, p_ua, p_course_id, p_lesson_id)
  returning id into v_attempt;

  return jsonb_build_object('ok', true, 'attempt_id', v_attempt,
    'deadline', now() + make_interval(mins => v_quiz.duration_minutes),
    'questions', (
      select jsonb_agg(jsonb_build_object(
        'item_id', it.id, 'question_id', q.id, 'content', q.content,
        'type', q.question_type, 'points', it.points,
        'options', (select jsonb_agg(jsonb_build_object('id', o.id, 'content', o.content)
                      order by case when v_quiz.shuffle_options then random() else o.order_index end)
                    from public.quiz_bank_options o where o.question_id = q.id))
        order by array_position(v_order, it.id))
      from public.quiz_items it join public.quiz_bank_questions q on q.id = it.question_id
      where it.id = any(v_order)));
end $function$;
