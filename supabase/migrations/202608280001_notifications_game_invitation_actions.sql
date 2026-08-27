drop function if exists public.get_my_notifications(int);

create function public.get_my_notifications(max_results int default 12)
returns table (
  id uuid,
  type text,
  actor_id uuid,
  actor_display_name text,
  actor_avatar_url text,
  game_id uuid,
  game_title text,
  game_invitation_id uuid,
  game_invitation_status text,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  result_limit int := least(greatest(coalesce(max_results, 12), 1), 50);
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return query
    select
      notification.id,
      notification.type,
      notification.actor_id,
      actor.display_name,
      actor.avatar_url,
      notification.game_id,
      game.title,
      notification.game_invitation_id,
      invitation.status,
      notification.created_at,
      notification.read_at
    from public.notifications notification
    left join public.profiles actor on actor.id = notification.actor_id
    left join public.games game on game.id = notification.game_id
    left join public.game_invitations invitation on invitation.id = notification.game_invitation_id
    where notification.user_id = current_user_id
    order by notification.created_at desc
    limit result_limit;
end;
$$;

revoke all on function public.get_my_notifications(int) from public;
grant execute on function public.get_my_notifications(int) to authenticated;
