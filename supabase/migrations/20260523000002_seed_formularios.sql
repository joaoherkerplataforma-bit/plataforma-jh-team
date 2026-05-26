-- =============================================================
-- Migration: 20260523000002_seed_formularios
-- Pre-cria os 5 formularios da operacao (espelham os Google Forms atuais).
-- Idempotente: ON CONFLICT (slug) DO NOTHING — nao sobrescreve edicoes do Joao.
-- =============================================================

INSERT INTO public.formularios (slug, titulo, descricao, acao, ativo, campos) VALUES
(
  'anamnese',
  'Anamnese — Diagnóstico Dieta',
  'Formulário de entrada. Preencha com atenção: é a partir daqui que monto seu protocolo.',
  'anamnese',
  true,
  '[
    {"key":"email","tipo":"email","label":"E-mail","obrigatorio":true,"mapeia_para":"email"},
    {"key":"nome_completo","tipo":"texto_curto","label":"Qual é o seu nome COMPLETO?","obrigatorio":true,"mapeia_para":"nome"},
    {"key":"telefone","tipo":"telefone","label":"Número do celular (WhatsApp)","obrigatorio":true,"mapeia_para":"telefone"},
    {"key":"qual_plano","tipo":"escolha_unica","label":"Qual é o seu plano atual?","obrigatorio":true,"mapeia_para":"qual_plano","opcoes":["Trimestral - Dieta","Semestral - Dieta","Anual - Dieta","Trimestral - Dieta + Treino","Semestral - Dieta + Treino","Anual - Dieta + Treino"]},
    {"key":"origem","tipo":"escolha_unica","label":"Por onde você me conheceu ou soube da consultoria?","obrigatorio":false,"mapeia_para":"origem","opcoes":["Instagram","TikTok","YouTube","Indicação"]}
  ]'::jsonb
),
(
  'fotos-iniciais',
  'Fotos Iniciais',
  'Envie suas fotos de avaliação inicial. Boa iluminação e fundo neutro ajudam bastante.',
  'fotos_iniciais',
  true,
  '[
    {"key":"nome_completo","tipo":"texto_curto","label":"Nome completo","obrigatorio":true,"mapeia_para":"nome"},
    {"key":"email","tipo":"email","label":"E-mail","obrigatorio":true,"mapeia_para":"email"},
    {"key":"foto_frente","tipo":"upload_foto","label":"Foto de frente","obrigatorio":true},
    {"key":"foto_lado","tipo":"upload_foto","label":"Foto de lado","obrigatorio":true},
    {"key":"foto_costas","tipo":"upload_foto","label":"Foto de costas","obrigatorio":true}
  ]'::jsonb
),
(
  'treino',
  'Diagnóstico de Treino',
  'Apenas para o plano completo (Dieta + Treino).',
  'treino',
  true,
  '[
    {"key":"nome_completo","tipo":"texto_curto","label":"Nome completo","obrigatorio":true,"mapeia_para":"nome"},
    {"key":"email","tipo":"email","label":"E-mail","obrigatorio":true,"mapeia_para":"email"},
    {"key":"experiencia","tipo":"texto_longo","label":"Qual a sua experiência com treino de musculação?","obrigatorio":false},
    {"key":"dias_disponiveis","tipo":"escolha_unica","label":"Quantos dias por semana você pode treinar?","obrigatorio":false,"opcoes":["2","3","4","5","6"]},
    {"key":"local_treino","tipo":"escolha_unica","label":"Onde você treina?","obrigatorio":false,"opcoes":["Academia","Em casa","Ar livre"]},
    {"key":"lesoes","tipo":"texto_longo","label":"Possui alguma lesão ou limitação física? Descreva.","obrigatorio":false}
  ]'::jsonb
),
(
  'fotos-30-dias',
  'Fotos — Retorno 30 dias',
  'Tente repetir o mesmo ângulo, roupa e iluminação das fotos iniciais.',
  'fotos_30dias',
  true,
  '[
    {"key":"nome_completo","tipo":"texto_curto","label":"Nome completo","obrigatorio":true,"mapeia_para":"nome"},
    {"key":"email","tipo":"email","label":"E-mail","obrigatorio":true,"mapeia_para":"email"},
    {"key":"foto_frente","tipo":"upload_foto","label":"Foto de frente","obrigatorio":true},
    {"key":"foto_lado","tipo":"upload_foto","label":"Foto de lado","obrigatorio":true},
    {"key":"foto_costas","tipo":"upload_foto","label":"Foto de costas","obrigatorio":true}
  ]'::jsonb
),
(
  'feedback-retorno',
  'Feedback & Retorno Dietético',
  'Seu feedback do mês. Quanto mais detalhe, melhor eu ajusto seu próximo protocolo.',
  'feedback_retorno',
  true,
  '[
    {"key":"email","tipo":"email","label":"E-mail","obrigatorio":true,"mapeia_para":"email"},
    {"key":"nome_completo","tipo":"texto_curto","label":"Qual seu nome completo?","obrigatorio":true,"mapeia_para":"nome"},
    {"key":"peso_jejum","tipo":"texto_curto","label":"Você saberia me relatar seu peso em jejum?","obrigatorio":false},
    {"key":"adesao_dieta","tipo":"escala_0_10","label":"De 0-10, qual nota você daria à sua adesão à dieta no último mês?","obrigatorio":false},
    {"key":"nivel_fome","tipo":"escala_0_10","label":"De 0-10, qual nota você daria ao nível de fome no último mês?","obrigatorio":false},
    {"key":"alteracao_dietetica","tipo":"texto_longo","label":"Para o nosso próximo mês juntos, existe alguma alteração que você gostaria que fosse feita no âmbito DIETÉTICO?","obrigatorio":false},
    {"key":"refeicoes_livres","tipo":"texto_longo","label":"Como foi sua relação mental com as refeições livres? Fez as refeições como programado?","obrigatorio":false},
    {"key":"adesao_treino","tipo":"escala_0_10","label":"De 0-10, qual nota você daria à sua adesão ao treino no último mês?","obrigatorio":false},
    {"key":"desempenho_treinos","tipo":"texto_longo","label":"Me conte como foi seu desempenho nos treinos.","obrigatorio":false},
    {"key":"adesao_cardio","tipo":"escala_0_10","label":"De 0-10, qual nota você daria à sua adesão ao cardio no último mês?","obrigatorio":false},
    {"key":"media_cardio","tipo":"texto_curto","label":"Qual foi a sua MÉDIA SEMANAL de cardio desse mês?","obrigatorio":false},
    {"key":"meta_cardio","tipo":"texto_curto","label":"E me relembre, qual foi a nossa meta semanal teórica no começo do mês?","obrigatorio":false},
    {"key":"saude_intestinal","tipo":"escala_0_10","label":"De 0-10, qual nota você daria à sua saúde intestinal no último mês?","obrigatorio":false},
    {"key":"ingestao_agua","tipo":"escala_0_10","label":"De 0-10, qual nota você daria à sua ingestão de água no último mês?","obrigatorio":false},
    {"key":"sono","tipo":"escala_0_10","label":"De 0-10, qual nota você daria ao seu sono no último mês?","obrigatorio":false},
    {"key":"justificativa_sono","tipo":"texto_longo","label":"Gostaria de justificar a resposta acima?","obrigatorio":false},
    {"key":"nota_resultados","tipo":"escala_0_10","label":"De 0-10, como você classificaria seus resultados esse mês (físico e mental)?","obrigatorio":false},
    {"key":"auto_percepcao","tipo":"texto_longo","label":"Como foi a sua auto percepção das mudanças do seu físico esse mês?","obrigatorio":false},
    {"key":"experiencia_mes","tipo":"texto_longo","label":"Me conte como foi sua experiência nesses últimos 30 dias de acompanhamento.","obrigatorio":false}
  ]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
