-- Remplacer les deux UUID avant exécution locale.
\set player_one '00000000-0000-0000-0000-000000000001'
\set player_two '00000000-0000-0000-0000-000000000002'
insert into public.profiles(id,display_name) values(:'player_one','Mara'),(:'player_two','Ilyon');
insert into public.games(id,invite_code,owner_id,title,status,play_mode,turn_number,current_phase) values('10000000-0000-0000-0000-000000000001','NACRE-27',:'player_one','Les Échos de Nacre','active','asynchronous',3,'decision');
insert into public.game_players(game_id,player_id) values('10000000-0000-0000-0000-000000000001',:'player_one'),('10000000-0000-0000-0000-000000000001',:'player_two');
