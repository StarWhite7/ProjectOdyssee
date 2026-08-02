alter function public.create_game(text,public.play_mode,int,jsonb)
set search_path = 'extensions';

notify pgrst, 'reload schema';
