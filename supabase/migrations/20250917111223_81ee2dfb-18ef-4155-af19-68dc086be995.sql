-- Corrige o prize_id incorreto na conquista da Larissa
UPDATE prize_achievements 
SET prize_id = '90753d8c-0309-4085-b10c-3497d965ec67'
WHERE user_id = '0c8d113d-7cc7-4b8e-96d9-d7da6bcd88ae' 
AND prize_id = '478e257c-1b79-468f-b256-0ac4bf51b24b';