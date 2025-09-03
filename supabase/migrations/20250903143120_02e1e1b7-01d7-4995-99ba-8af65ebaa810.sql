-- Create enum for software categories
CREATE TYPE public.software_category AS ENUM ('modelagem_3d', 'renderizacao', 'colaboracao', 'animacao', 'documentacao');

-- Create table for expertise categories
CREATE TABLE public.ai_expertise_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category software_category NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for software knowledge base
CREATE TABLE public.ai_software_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  software_name TEXT NOT NULL,
  category software_category NOT NULL,
  description TEXT,
  differentials TEXT,
  common_objections TEXT,
  sales_scripts TEXT,
  use_cases TEXT,
  roi_points TEXT,
  competitors TEXT,
  pricing_strategy TEXT,
  target_audience TEXT,
  integration_benefits TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to ai_chat_preferences
ALTER TABLE public.ai_chat_preferences 
ADD COLUMN selected_expertise TEXT[] DEFAULT '{}',
ADD COLUMN active_software_focus TEXT DEFAULT 'sketchup',
ADD COLUMN custom_instructions TEXT,
ADD COLUMN expertise_template TEXT DEFAULT 'general';

-- Enable RLS on new tables
ALTER TABLE public.ai_expertise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_software_knowledge ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_expertise_categories (read-only for all authenticated users)
CREATE POLICY "All users can view expertise categories" 
ON public.ai_expertise_categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create policies for ai_software_knowledge (read-only for all authenticated users)
CREATE POLICY "All users can view software knowledge" 
ON public.ai_software_knowledge 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Insert initial software knowledge data
INSERT INTO public.ai_software_knowledge (software_name, category, description, differentials, common_objections, sales_scripts, use_cases, roi_points, competitors, target_audience) VALUES

-- SketchUp Pro
('SketchUp Pro', 'modelagem_3d', 'Software de modelagem 3D intuitivo e poderoso para arquitetura e design', 
'Interface intuitiva, biblioteca 3D Warehouse, LayOut para documentação, extensões robustas', 
'Muito simples para projetos profissionais|Não é CAD tradicional|Falta precisão para engenharia',
'SketchUp Pro não é apenas simples, é eficiente. Reduza 70% do tempo de modelagem mantendo precisão profissional.|LayOut permite documentação técnica completa integrada ao modelo 3D.|3D Warehouse oferece milhões de componentes gratuitos, acelerando projetos.',
'Arquitetura|Design de interiores|Paisagismo|Planejamento urbano|Apresentações para clientes',
'Redução de 70% no tempo de modelagem|Apresentações 3D impactam 85% mais que plantas 2D|ROI de 300% no primeiro ano',
'AutoCAD|Revit|ArchiCAD|Vectorworks', 'Arquitetos|Designers|Paisagistas|Estudantes'),

-- SketchUp Studio
('SketchUp Studio', 'modelagem_3d', 'Versão completa com ferramentas avançadas e renderização', 
'Inclui tudo do Pro + V-Ray, Scan Essentials, PreDesign, acesso ilimitado à biblioteca', 
'Preço alto comparado ao Pro|Recursos que não vou usar|V-Ray muito complexo',
'Studio oferece fluxo completo: do conceito ao render fotorrealístico.|V-Ray integrado elimina necessidade de software separado.|PreDesign otimiza fase inicial com análises climáticas.',
'Projetos premium|Renders de alta qualidade|Análises ambientais|Projetos BIM',
'Elimina necessidade de múltiplos softwares|Renders profissionais aumentam taxa de aprovação em 60%',
'Revit + 3ds Max + V-Ray|ArchiCAD + Cinema 4D', 'Escritórios grandes|Arquitetos premium|Renderistas'),

-- ZWCAD
('ZWCAD', 'modelagem_3d', 'CAD 2D/3D compatível com AutoCAD a preço acessível', 
'Compatibilidade total DWG|Interface familiar AutoCAD|Preço 70% menor|Suporte técnico local', 
'Nunca ouvi falar|Preferimos AutoCAD|Pode ter problemas de compatibilidade|E se a empresa falir?',
'ZWCAD tem 20+ anos no mercado, usado por milhões mundialmente.|Compatibilidade 99.9% com AutoCAD, sem perda de produtividade.|Economia de 70% em licenças pode financiar treinamento da equipe.',
'CAD 2D tradicional|Projetos de engenharia|Detalhamento técnico|Migração do AutoCAD',
'Economia de 70% em licenças|Mesma produtividade do AutoCAD|Suporte em português',
'AutoCAD|DraftSight|BricsCAD', 'Engenheiros|Projetistas CAD|Escritórios técnicos'),

-- V-Ray
('V-Ray', 'renderizacao', 'Engine de renderização fotorrealística líder mundial', 
'Qualidade fotorrealística|Integração com principais softwares|Controle total iluminação|GPU rendering', 
'Muito complexo|Já temos render básico|Tempo de render muito alto|Caro demais',
'V-Ray é o padrão da indústria, usado em Hollywood e grandes escritórios.|GPU rendering reduz tempo em 90% vs CPU.|Renders fotorrealísticos fecham 40% mais contratos.',
'Arquiviz profissional|Marketing imobiliário|Apresentações executivas|Concursos de arquitetura',
'40% mais contratos fechados com renders profissionais|Redução 90% tempo render com GPU',
'Corona|Lumion|Enscape|KeyShot', 'Renderistas|Escritórios premium|Imobiliárias'),

-- Enscape
('Enscape', 'renderizacao', 'Renderização em tempo real e realidade virtual', 
'Render em tempo real|VR/AR nativo|Interface simples|Sincronização automática com modelo', 
'Qualidade inferior ao V-Ray|Limitado para animações|Preciso de mais controle|Caro para o que oferece',
'Enscape entrega 80% da qualidade em 10% do tempo.|VR permite clientes "andarem" no projeto antes da construção.|Tempo real elimina espera por renders.',
'Apresentações dinâmicas|VR para clientes|Renders rápidos|Validação de projetos',
'Aprovação de projetos 60% mais rápida|Redução 95% tempo de render|VR aumenta satisfação cliente',
'Lumion|Twinmotion|V-Ray|Corona', 'Arquitetos|Designers|Imobiliárias'),

-- Enscape Impact
('Enscape Impact', 'renderizacao', 'Análise de sustentabilidade integrada ao Enscape', 
'Certificações LEED/BREEAM|Análises em tempo real|Integração total Enscape|Relatórios automáticos', 
'Sustentabilidade é só marketing|Muito técnico|Clientes não pedem isso|Custa extra',
'Sustentabilidade é requisito legal crescente.|Certificações agregam 15% valor ao imóvel.|Impact gera relatórios automaticamente do modelo existente.',
'Projetos sustentáveis|Certificações verdes|Compliance ambiental|Marketing premium',
'15% valor agregado com certificações|Redução custos operacionais|Diferencial competitivo',
'IES VE|DesignBuilder|EnergyPlus', 'Escritórios sustentáveis|Construtoras premium'),

-- Archline
('Archline', 'modelagem_3d', 'CAD arquitetônico nacional com biblioteca brasileira', 
'Biblioteca nacional|Normas ABNT nativas|Preço acessível|Suporte em português|Foco residencial', 
'Preferimos software internacional|Limitado comercial/industrial|Equipe não conhece|Migração complexa',
'Archline acelera projetos residenciais em 50% com biblioteca nacional.|Normas ABNT automáticas eliminam erros de padronização.|Suporte presencial em todo Brasil.',
'Arquitetura residencial|Projetos populares|Escritórios regionais|Padronização ABNT',
'50% mais rápido em projetos residenciais|Conformidade automática ABNT|Suporte nacional',
'Promob|AutoCAD Architecture|Revit', 'Arquitetos residenciais|Escritórios regionais'),

-- Corona
('Corona', 'renderizacao', 'Engine de renderização intuitiva e poderosa', 
'Interface amigável|Qualidade profissional|Integração 3ds Max/Cinema 4D|Aprendizado rápido', 
'V-Ray é padrão|Menos recursos|Comunidade menor|Por que trocar?',
'Corona oferece 90% qualidade V-Ray com 50% complexidade.|Aprendizado em 1 semana vs 1 mês V-Ray.|Interface intuitiva aumenta produtividade diária.',
'Renders arquitetônicos|Visualização produto|Marketing digital|Apresentações comerciais',
'Produtividade 50% maior que V-Ray|Aprendizado 75% mais rápido|Qualidade profissional garantida',
'V-Ray|Octane|Redshift|Arnold', 'Novos renderistas|Escritórios médios|Freelancers'),

-- Phoenix
('Phoenix', 'animacao', 'Simulação de fluidos e dinâmicas para 3ds Max', 
'Simulações realísticas|Fogo/fumaça/líquidos|Integração V-Ray|Controle artístico total', 
'Muito específico|Não fazemos animações|Complexo demais|Hardware exigente',
'Phoenix cria efeitos impossíveis de fotografar.|Animações com fluidos aumentam engajamento 300%.|Integração V-Ray garante qualidade cinematográfica.',
'Animações arquitetônicas|Marketing imobiliário|Apresentações especiais|Efeitos cinematográficos',
'300% mais engajamento em animações|Diferencial único no mercado|Projetos premium valorização',
'RealFlow|Houdini|Blender Fluid|Maya Fluids', 'Animadores 3D|Estúdios criativos|Marketing premium'),

-- Chaos Vantage
('Chaos Vantage', 'renderizacao', 'Visualização interativa de projetos grandes em tempo real', 
'Projetos gigantes|Performance superior|Colaboração tempo real|Integração V-Ray|Multiplataforma', 
'Projetos pequenos não precisam|Muito específico|Team já tem soluções|Custo benefício questionável',
'Vantage permite navegação fluida em projetos de milhões de polígonos.|Colaboração remota em tempo real economiza reuniões presenciais.|Performance superior libera equipe para criatividade.',
'Grandes empreendimentos|Colaboração equipes|Apresentações interativas|Validação projetos',
'Reuniões presenciais reduzidas 70%|Performance 10x superior|Colaboração global seamless',
'Lumion|Twinmotion|Unity Reflect|Unreal Engine', 'Grandes escritórios|Construtoras|Incorporadoras'),

-- Anima (Chaos)
('Anima', 'animacao', 'Animação de personagens 4D para arquiviz', 
'Personagens realísticos|Integração total V-Ray|Biblioteca movimentos|Crowds inteligentes', 
'Personagens não são essenciais|Muito específico|Complica o render|Custa extra',
'Personagens trazem vida e escala aos projetos.|Crowds mostram funcionalidade real dos espaços.|Integração V-Ray mantém qualidade sem complicações.',
'Arquiviz com pessoas|Marketing imobiliário|Espaços públicos|Apresentações dinâmicas',
'Projetos mais vendáveis|Escala humana clara|Diferencial mercado|Maior engajamento',
'Forest Pack People|Renderpeople|Human Alloy', 'Renderistas|Marketing imobiliário|Arquitetos comerciais'),

-- Trimble Connect
('Trimble Connect', 'colaboracao', 'Plataforma BIM colaborativa integrada ao SketchUp', 
'Colaboração BIM|Sincronização automática|Acesso mobile|Integração SketchUp nativa|Controle versões', 
'Já usamos outras plataformas|BIM muito complexo|Equipe não está pronta|Custo mensal alto',
'Connect elimina erros de versão que custam 15% do projeto.|Mobile permite validação em obra.|Integração SketchUp oferece BIM sem complexidade.',
'Colaboração equipes|Controle versões|BIM Level 2|Coordenação obras|Acesso mobile',
'15% redução erros projeto|40% mais agilidade aprovações|Colaboração global seamless',
'BIM 360|Tekla BIMsight|Dalux|PlanGrid', 'Equipes BIM|Construtoras|Escritórios colaborativos');

-- Insert initial expertise categories
INSERT INTO public.ai_expertise_categories (name, category, description) VALUES
('Modelagem 3D', 'modelagem_3d', 'Softwares para criação e edição de modelos tridimensionais'),
('Renderização', 'renderizacao', 'Engines e ferramentas para criação de imagens fotorrealísticas'),
('Colaboração BIM', 'colaboracao', 'Plataformas para trabalho colaborativo em projetos'),
('Animação 3D', 'animacao', 'Ferramentas para animação e efeitos especiais'),
('Documentação', 'documentacao', 'Softwares para documentação técnica e apresentação');

-- Add trigger for updated_at on new tables
CREATE TRIGGER update_ai_expertise_categories_updated_at
BEFORE UPDATE ON public.ai_expertise_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_software_knowledge_updated_at
BEFORE UPDATE ON public.ai_software_knowledge
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();