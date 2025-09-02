-- Limpar todos os dados para novo início
-- Remove todos os relatórios diários
DELETE FROM daily_reports;

-- Remove todas as metas mensais
DELETE FROM monthly_targets;

-- Remove todas as conquistas de prêmios
DELETE FROM prize_achievements;

-- Remove todos os prêmios
DELETE FROM prizes;

-- Remove todas as conversas da IA
DELETE FROM ai_conversations;

-- Remove todos os logs de acesso a perfis
DELETE FROM profile_access_log;

-- Reset sequences (se houver) para começar do zero
-- Nota: Como usamos UUID, não há sequences para resetar