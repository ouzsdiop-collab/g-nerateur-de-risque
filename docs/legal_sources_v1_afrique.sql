
-- Base réglementaire QHSE Control — V1 Afrique de l'Ouest
-- À exécuter dans Supabase/Postgres.
create table if not exists legal_sources (
  id text primary key,
  country text not null,
  authority text,
  title text not null,
  source_type text,
  topic text,
  obligation text,
  summary text,
  exact_excerpt_short text,
  risk_implication text,
  risk_tags text[],
  reliability_level text,
  status text default 'active',
  last_verified_at date,
  source_url text,
  created_at timestamp default now()
);

create table if not exists risk_legal_map (
  risk_tag text not null,
  legal_source_id text not null references legal_sources(id),
  primary key (risk_tag, legal_source_id)
);


insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'ALL-OIT-C155','ALL','Organisation Internationale du Travail (OIT)','Convention n°155 sur la sécurité et la santé des travailleurs','OIT','cadre_sst',
  'Mettre en place une politique de prévention et garantir des conditions de travail sûres et sans risque pour la santé, selon les responsabilités applicables.','Cadre international de référence pour la sécurité et la santé au travail, utilisé comme socle transversal dans le générateur.','Cadre SST au niveau national et au niveau de l''entreprise ; obligations à préciser selon le droit national.','Un défaut d’évaluation et de prévention peut aggraver la responsabilité de l’employeur en cas d’accident.',
  ARRAY['general','prevention','audit','accident','formation','epi','machines'],'élevé','active','2026-04-25','https://www.ilo.org/media/107601/download'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'ALL-OIT-C187','ALL','Organisation Internationale du Travail (OIT)','Convention n°187 sur le cadre promotionnel pour la SST','OIT','systeme_management_sst',
  'Promouvoir l’amélioration continue de la sécurité et santé au travail dans un cadre structuré.','Référence internationale pour structurer une démarche SST progressive et documentée.','Cadre promotionnel SST — amélioration continue et culture de prévention.','Sans système de suivi, les risques identifiés restent peu maîtrisés.',
  ARRAY['general','management','audit','plan_action'],'élevé','active','2026-04-25','https://www.ilo.org/resource/c187-promotional-framework-occupational-safety-and-health-convention-2006'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'ALL-IFC-PS2','ALL','International Finance Corporation (IFC)','Performance Standard 2 — Labor and Working Conditions','IFC','conditions_travail_sst',
  'Fournir un environnement de travail sûr et sain, en tenant compte des risques propres au secteur et aux zones de travail.','Standard clé pour les projets financés ou audités par des bailleurs internationaux.','Client to provide a safe and healthy work environment, taking into account inherent risks.','Un manque de maîtrise SST peut bloquer un financement, un audit ou une exigence client.',
  ARRAY['general','bailleur','audit','sst','sous_traitants'],'élevé','active','2026-04-25','https://www.ifc.org/content/dam/ifc/doc/2010/2012-ifc-performance-standard-2-en.pdf'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'CI-CODE-TRAVAIL-2015','ci','Inspection du Travail · autorités compétentes ivoiriennes','Côte d’Ivoire — Code du Travail, Loi n°2015-532','loi','obligation_generale_employeur',
  'Assurer la protection de la santé et de la sécurité des travailleurs, organiser la prévention et respecter les règles applicables du Code du travail.','Base nationale principale pour les relations employeur-travailleur et obligations de prévention.','Le Code du travail régit les relations entre employeurs et travailleurs sur le territoire ivoirien.','Accident grave ou défaut de prévention : risque social, civil, administratif et réputationnel.',
  ARRAY['general','accident','formation','machines','epi','sous_traitants'],'élevé','active','2026-04-25','https://www.economie-ivoirienne.ci/sites/default/files/sites/default/files/inline-files/Loi%20n%C2%B0%202015-532%20du%2020%20juillet%202015%20portant%20code%20du%20Travail.pdf'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'SN-DECRET-2006-1256','sn','Inspection du Travail et de la Sécurité sociale','Sénégal — Décret n°2006-1256 relatif aux obligations de sécurité et santé au travail','décret','evaluation_risques',
  'Disposer d’une évaluation des risques pour la sécurité et la santé au travail, déterminer les mesures de protection et tenir une liste des activités de travail.','Source forte pour justifier une évaluation structurée des risques au Sénégal.','L’employeur doit disposer d’une évaluation des risques pour la sécurité et la santé au travail.','Absence d’évaluation : exposition forte en cas de contrôle, audit ou accident.',
  ARRAY['general','audit','plan_action','evaluation','formation'],'élevé','active','2026-04-25','https://natlex.ilo.org/dyn/natlex2/natlex2/files/download/81947/SEN-81947.pdf'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'SN-DECRET-2006-1250','sn','Inspection du Travail et de la Sécurité sociale','Sénégal — Décret n°2006-1250 sur la circulation des véhicules et engins en entreprise','décret','circulation_engins',
  'Organiser la circulation des véhicules, engins mobiles et travailleurs afin d’éviter les risques de heurts et collisions.','Référence utile pour les risques transport interne, logistique, mines, BTP et sites industriels.','Fixe les règles relatives à la circulation, dans l’entreprise, des véhicules et engins mobiles.','Collision engin-piéton : risque critique souvent mortel et fortement auditée.',
  ARRAY['transport','circulation','vehicule','engin','collision','route'],'élevé','active','2026-04-25','https://www.scribd.com/document/779586054/D-2006-1250-Circulation-ve-hicules-et-engins'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'ML-CODE-TRAVAIL-1992','ml','Direction Nationale du Travail · Inspection du Travail','Mali — Code du Travail, Loi n°92-020','loi','cadre_travail_sst',
  'Respecter les règles nationales du travail et intégrer les questions de sécurité et santé au travail dans la prévention.','Base nationale du droit du travail malien ; à compléter par textes d’application sectoriels.','Le Code régit les relations de travail ; le Conseil supérieur du Travail traite aussi de santé et sécurité au travail.','Un défaut de prévention peut exposer à contrôle, litige ou aggravation de responsabilité.',
  ARRAY['general','accident','sst','formation','machines'],'moyen','active','2026-04-25','https://sgg-mali.ml/codes/mali-code-du-itravail-1992.pdf'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'BF-CODE-TRAVAIL-2008','bf','Inspection du Travail · autorités SST compétentes','Burkina Faso — Code du Travail, Loi n°028-2008/AN','loi','cadre_travail_sst',
  'Respecter les obligations de prévention, d’hygiène, de sécurité et de protection des travailleurs prévues par le droit du travail.','Base du droit du travail au Burkina Faso ; à compléter par textes SST et sectoriels.','Loi n°028-2008/AN portant Code du travail au Burkina Faso.','Manque de documentation HSE : faiblesse en cas d’audit ou de contrôle.',
  ARRAY['general','sst','formation','audit'],'moyen','active','2026-04-25','https://natlex.ilo.org/dyn/natlex2/natlex2/files/download/79332/BFA-79332.pdf'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'GN-CODE-TRAVAIL-2014','gn','Inspection du Travail · autorités guinéennes compétentes','Guinée — Code du Travail, Loi L/2014/072/CNT','loi','cadre_travail_sst',
  'Appliquer les règles nationales relatives aux conditions de travail, à la santé et à la sécurité au travail.','Cadre juridique principal du travail en Guinée, incluant la santé et sécurité au travail.','Code du travail de la République de Guinée — relations de travail, santé et sécurité.','Non maîtrise des risques : exposition en cas d’accident, contrôle ou exigence bailleur.',
  ARRAY['general','sst','formation','audit','mines'],'moyen','active','2026-04-25','https://soguipami.net/wp-content/uploads/2020/06/Codedutravail2014-ilovepdf-compressed.pdf'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'GH-LABOUR-ACT-2003','gh','Labour Department · Factories Inspectorate','Ghana — Labour Act 2003, Act 651','loi','occupational_health_safety_environment',
  'Ensure safe and healthy working conditions, including instruction, training and supervision where applicable.','Ghanaian labour framework including Part XV on occupational health, safety and environment.','Part XV — Occupational Health, Safety and Environment; general health and safety conditions.','Poor OHS controls can trigger inspection findings, liability and business disruption.',
  ARRAY['general','training','machines','audit','accident'],'élevé','active','2026-04-25','https://www.gipc.gov.gh/wp-content/uploads/2023/05/LABOUR-ACT-2003-ACT-651.pdf'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'TG-CODE-TRAVAIL-2021','tg','Inspection du Travail · autorités togolaises compétentes','Togo — Code du Travail, Loi n°2021-012','loi','cadre_travail_sst',
  'Respecter les obligations du Code du travail relatives aux relations de travail, à la prévention et aux conditions de travail.','Code du travail togolais applicable aux relations employeurs-travailleurs.','La loi institue le Code du travail de la République togolaise.','Absence de démarche HSE : risque de non-conformité et difficulté en audit.',
  ARRAY['general','sst','audit','formation'],'moyen','active','2026-04-25','https://investissement.gouv.tg/wp-content/uploads/2021/08/Loi-n%C2%B0-2021-012-portant-code-du-travail_nouveau.pdf'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'BJ-CODE-TRAVAIL-1998','bj','Inspection du Travail · CNSS · autorités béninoises compétentes','Bénin — Code du Travail, Loi n°98-004','loi','cadre_travail_sst',
  'Appliquer les dispositions du Code du travail aux travailleurs et employeurs, y compris les obligations liées à la sécurité et santé au travail.','Code du travail béninois ; comprend notamment une commission nationale de sécurité et santé au travail.','La loi est applicable aux travailleurs et employeurs exerçant leur activité professionnelle au Bénin.','Non documentation HSE : fragilité en cas d’accident, litige ou inspection.',
  ARRAY['general','sst','audit','formation'],'moyen','active','2026-04-25','https://travail.gouv.bj/download-data/docs/2112310618-935pdf.pdf/Loi%20no%2098-004%20du%2027%20janvier%201998'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into legal_sources (
  id,country,authority,title,source_type,topic,obligation,summary,exact_excerpt_short,risk_implication,risk_tags,reliability_level,status,last_verified_at,source_url
) values (
  'NG-FACTORIES-ACT','ng','Federal Ministry of Labour and Employment · Factories Inspectorate','Nigeria — Factories Act','loi','factory_health_safety_welfare',
  'Secure health, safety and welfare in factories and relevant workplaces, and require workers to use safety means provided.','Key Nigerian workplace safety instrument for factories and industrial workplaces.','Securing health, safety or welfare of persons employed in factories or applicable workplaces.','Failure to maintain safety controls can lead to inspection action, accident liability and operational disruption.',
  ARRAY['general','factory','machines','epi','training','accident'],'élevé','active','2026-04-25','https://lawsofnigeria.placng.org/laws/F1.pdf'
) on conflict (id) do update set
  country=excluded.country,
  authority=excluded.authority,
  title=excluded.title,
  source_type=excluded.source_type,
  topic=excluded.topic,
  obligation=excluded.obligation,
  summary=excluded.summary,
  exact_excerpt_short=excluded.exact_excerpt_short,
  risk_implication=excluded.risk_implication,
  risk_tags=excluded.risk_tags,
  reliability_level=excluded.reliability_level,
  status=excluded.status,
  last_verified_at=excluded.last_verified_at,
  source_url=excluded.source_url;

insert into risk_legal_map (risk_tag, legal_source_id) values ('transport','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('transport','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('transport','SN-DECRET-2006-1250') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('circulation','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('circulation','SN-DECRET-2006-1250') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('vehicule','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('vehicule','SN-DECRET-2006-1250') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('route','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('route','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('route','SN-DECRET-2006-1250') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('machine','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('machine','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('machine','GH-LABOUR-ACT-2003') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('machine','NG-FACTORIES-ACT') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('machines','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('machines','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('machines','GH-LABOUR-ACT-2003') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('machines','NG-FACTORIES-ACT') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('bruit','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('bruit','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('poussiere','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('poussiere','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('chimique','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('chimique','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('cyanure','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('cyanure','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('incendie','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('incendie','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('chaleur','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('chaleur','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('thermique','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('thermique','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('tms','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('manutention','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('paludisme','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('paludisme','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('biologique','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('biologique','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('sous_traitants','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('sous_traitants','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('formation','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('formation','ALL-IFC-PS2') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('formation','GH-LABOUR-ACT-2003') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('epi','ALL-OIT-C155') on conflict do nothing;
insert into risk_legal_map (risk_tag, legal_source_id) values ('epi','NG-FACTORIES-ACT') on conflict do nothing;