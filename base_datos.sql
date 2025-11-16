-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.alertas_oficiales (
  id integer NOT NULL DEFAULT nextval('alertas_oficiales_id_seq'::regclass),
  titulo character varying NOT NULL,
  cuerpo text NOT NULL,
  nivel character varying NOT NULL CHECK (nivel::text = ANY (ARRAY['CRITICA'::character varying, 'RELEVANTE'::character varying, 'OFICIAL'::character varying]::text[])),
  denuncia_id uuid,
  cuadrante_id integer,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT alertas_oficiales_pkey PRIMARY KEY (id),
  CONSTRAINT alertas_oficiales_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id),
  CONSTRAINT alertas_oficiales_denuncia_id_fkey FOREIGN KEY (denuncia_id) REFERENCES public.denuncias(id),
  CONSTRAINT alertas_oficiales_cuadrante_id_fkey FOREIGN KEY (cuadrante_id) REFERENCES public.cuadrantes(id)
);
CREATE TABLE public.asignaciones_inspector (
  id integer NOT NULL DEFAULT nextval('asignaciones_inspector_id_seq'::regclass),
  denuncia_id uuid NOT NULL,
  asignado_por uuid,
  fecha_derivacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_inicio_atencion timestamp with time zone,
  fecha_termino timestamp with time zone,
  inspector_id integer NOT NULL,
  CONSTRAINT asignaciones_inspector_pkey PRIMARY KEY (id),
  CONSTRAINT asignaciones_inspector_denuncia_id_fkey FOREIGN KEY (denuncia_id) REFERENCES public.denuncias(id),
  CONSTRAINT asignaciones_inspector_asignado_por_fkey FOREIGN KEY (asignado_por) REFERENCES auth.users(id),
  CONSTRAINT asignaciones_inspector_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.inspectores(id)
);
CREATE TABLE public.audit_log (
  id bigint NOT NULL DEFAULT nextval('audit_log_id_seq'::regclass),
  ts timestamp with time zone NOT NULL DEFAULT now(),
  actor_user_id uuid,
  actor_email text,
  actor_es_portal boolean,
  actor_es_admin boolean,
  tabla text NOT NULL,
  operacion USER-DEFINED NOT NULL,
  fila_id_text text,
  old_row jsonb,
  new_row jsonb,
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cat_familias (
  id integer NOT NULL DEFAULT nextval('cat_familias_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cat_familias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cat_grupos (
  id integer NOT NULL DEFAULT nextval('cat_grupos_id_seq'::regclass),
  familia_id integer NOT NULL,
  nombre character varying NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cat_grupos_pkey PRIMARY KEY (id),
  CONSTRAINT cat_grupos_familia_id_fkey FOREIGN KEY (familia_id) REFERENCES public.cat_familias(id)
);
CREATE TABLE public.cat_req_mapeo_publico (
  requerimiento_id integer NOT NULL,
  categoria_publica_id integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cat_req_mapeo_publico_pkey PRIMARY KEY (requerimiento_id),
  CONSTRAINT cat_req_mapeo_publico_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES public.cat_requerimientos(id),
  CONSTRAINT cat_req_mapeo_publico_categoria_publica_id_fkey FOREIGN KEY (categoria_publica_id) REFERENCES public.categorias_publicas(id)
);
CREATE TABLE public.cat_requerimientos (
  id integer NOT NULL DEFAULT nextval('cat_requerimientos_id_seq'::regclass),
  subgrupo_id integer NOT NULL,
  nombre character varying NOT NULL,
  prioridad character varying,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cat_requerimientos_pkey PRIMARY KEY (id),
  CONSTRAINT cat_requerimientos_subgrupo_id_fkey FOREIGN KEY (subgrupo_id) REFERENCES public.cat_subgrupos(id)
);
CREATE TABLE public.cat_subgrupos (
  id integer NOT NULL DEFAULT nextval('cat_subgrupos_id_seq'::regclass),
  grupo_id integer NOT NULL,
  nombre character varying NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cat_subgrupos_pkey PRIMARY KEY (id),
  CONSTRAINT cat_subgrupos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.cat_grupos(id)
);
CREATE TABLE public.categorias_publicas (
  id integer NOT NULL DEFAULT nextval('categorias_publicas_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  orden smallint,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categorias_publicas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.comentario_reacciones (
  id bigint NOT NULL DEFAULT nextval('comentario_reacciones_id_seq'::regclass),
  comentario_id integer NOT NULL,
  usuario_id uuid NOT NULL,
  tipo text NOT NULL CHECK (upper(tipo) = ANY (ARRAY['LIKE'::text, 'DISLIKE'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT comentario_reacciones_pkey PRIMARY KEY (id),
  CONSTRAINT comentario_reacciones_comentario_id_fkey FOREIGN KEY (comentario_id) REFERENCES public.comentarios_denuncias(id),
  CONSTRAINT comentario_reacciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.comentarios_denuncias (
  id integer NOT NULL DEFAULT nextval('comentarios_denuncias_id_seq'::regclass),
  denuncia_id uuid NOT NULL,
  usuario_id uuid,
  anonimo boolean NOT NULL DEFAULT true,
  contenido text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  parent_id integer,
  CONSTRAINT comentarios_denuncias_pkey PRIMARY KEY (id),
  CONSTRAINT comentarios_denuncias_denuncia_id_fkey FOREIGN KEY (denuncia_id) REFERENCES public.denuncias(id),
  CONSTRAINT comentarios_denuncias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id),
  CONSTRAINT comentarios_denuncias_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comentarios_denuncias(id)
);
CREATE TABLE public.cuadrantes (
  id integer NOT NULL DEFAULT nextval('cuadrantes_id_seq'::regclass),
  codigo character varying NOT NULL UNIQUE,
  nombre character varying NOT NULL,
  descripcion text,
  CONSTRAINT cuadrantes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.denuncia_clasificaciones (
  id bigint NOT NULL DEFAULT nextval('denuncia_clasificaciones_id_seq'::regclass),
  denuncia_id uuid NOT NULL,
  requerimiento_id integer NOT NULL,
  vigente boolean NOT NULL DEFAULT true,
  comentario text,
  clasificado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT denuncia_clasificaciones_pkey PRIMARY KEY (id),
  CONSTRAINT denuncia_clasificaciones_denuncia_id_fkey FOREIGN KEY (denuncia_id) REFERENCES public.denuncias(id),
  CONSTRAINT denuncia_clasificaciones_requerimiento_id_fkey FOREIGN KEY (requerimiento_id) REFERENCES public.cat_requerimientos(id),
  CONSTRAINT denuncia_clasificaciones_clasificado_por_fkey FOREIGN KEY (clasificado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.denuncia_evidencias (
  id integer NOT NULL DEFAULT nextval('denuncia_evidencias_id_seq'::regclass),
  denuncia_id uuid NOT NULL,
  tipo character varying NOT NULL CHECK (tipo::text = ANY (ARRAY['FOTO'::character varying, 'VIDEO'::character varying]::text[])),
  storage_path text NOT NULL,
  orden smallint NOT NULL DEFAULT 1,
  hash character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT denuncia_evidencias_pkey PRIMARY KEY (id),
  CONSTRAINT denuncia_evidencias_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT denuncia_evidencias_denuncia_id_fkey FOREIGN KEY (denuncia_id) REFERENCES public.denuncias(id)
);
CREATE TABLE public.denuncia_historial (
  id integer NOT NULL DEFAULT nextval('denuncia_historial_id_seq'::regclass),
  denuncia_id uuid NOT NULL,
  evento character varying NOT NULL,
  detalle jsonb,
  actor_usuario_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT denuncia_historial_pkey PRIMARY KEY (id),
  CONSTRAINT denuncia_historial_denuncia_id_fkey FOREIGN KEY (denuncia_id) REFERENCES public.denuncias(id),
  CONSTRAINT denuncia_historial_actor_usuario_id_fkey FOREIGN KEY (actor_usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.denuncia_observaciones (
  id integer NOT NULL DEFAULT nextval('denuncia_observaciones_id_seq'::regclass),
  denuncia_id uuid NOT NULL,
  tipo character varying NOT NULL CHECK (tipo::text = ANY (ARRAY['OPERADOR'::character varying, 'TERRENO'::character varying]::text[])),
  contenido text NOT NULL,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT denuncia_observaciones_pkey PRIMARY KEY (id),
  CONSTRAINT denuncia_observaciones_denuncia_id_fkey FOREIGN KEY (denuncia_id) REFERENCES public.denuncias(id),
  CONSTRAINT denuncia_observaciones_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.denuncia_reacciones (
  id bigint NOT NULL DEFAULT nextval('denuncia_reacciones_id_seq'::regclass),
  denuncia_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  tipo text NOT NULL CHECK (upper(tipo) = ANY (ARRAY['LIKE'::text, 'DISLIKE'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT denuncia_reacciones_pkey PRIMARY KEY (id),
  CONSTRAINT denuncia_reacciones_denuncia_id_fkey FOREIGN KEY (denuncia_id) REFERENCES public.denuncias(id),
  CONSTRAINT denuncia_reacciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.denuncias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  folio character varying UNIQUE,
  ciudadano_id uuid NOT NULL,
  titulo character varying NOT NULL,
  descripcion text NOT NULL,
  estado_id integer NOT NULL,
  consentir_publicacion boolean NOT NULL DEFAULT false,
  anonimo boolean NOT NULL DEFAULT true,
  ubicacion_texto character varying,
  coords_x double precision,
  coords_y double precision,
  cuadrante_id integer,
  fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_inicio_atencion timestamp with time zone,
  fecha_cierre timestamp with time zone,
  prioridad_id bigint,
  inspector_id integer,
  categoria_publica_id integer,
  CONSTRAINT denuncias_pkey PRIMARY KEY (id),
  CONSTRAINT denuncias_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.estados_denuncia(id),
  CONSTRAINT denuncias_cuadrante_id_fkey FOREIGN KEY (cuadrante_id) REFERENCES public.cuadrantes(id),
  CONSTRAINT denuncias_ciudadano_id_fkey FOREIGN KEY (ciudadano_id) REFERENCES public.perfiles_ciudadanos(usuario_id),
  CONSTRAINT denuncias_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.inspectores(id),
  CONSTRAINT denuncias_categoria_publica_id_fkey FOREIGN KEY (categoria_publica_id) REFERENCES public.categorias_publicas(id),
  CONSTRAINT denuncias_prioridad_id_fkey FOREIGN KEY (prioridad_id) REFERENCES public.prioridades_denuncia(id)
);
CREATE TABLE public.estados_denuncia (
  id integer NOT NULL DEFAULT nextval('estados_denuncia_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  orden smallint NOT NULL,
  CONSTRAINT estados_denuncia_pkey PRIMARY KEY (id)
);
CREATE TABLE public.evento_turno_tipo (
  id integer NOT NULL DEFAULT nextval('evento_turno_tipo_id_seq'::regclass),
  codigo character varying NOT NULL UNIQUE,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT evento_turno_tipo_pkey PRIMARY KEY (id)
);
CREATE TABLE public.eventos_turno (
  id bigint NOT NULL DEFAULT nextval('eventos_turno_id_seq'::regclass),
  turno_id bigint NOT NULL,
  tipo_id integer NOT NULL,
  ts timestamp with time zone NOT NULL DEFAULT now(),
  observacion text,
  actor_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT eventos_turno_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_turno_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id),
  CONSTRAINT eventos_turno_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.evento_turno_tipo(id),
  CONSTRAINT eventos_turno_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.inspectores (
  id integer NOT NULL DEFAULT nextval('inspectores_id_seq'::regclass),
  activo boolean NOT NULL DEFAULT true,
  usuario_id uuid NOT NULL,
  tipo_turno integer,
  CONSTRAINT inspectores_pkey PRIMARY KEY (id),
  CONSTRAINT inspectores_user_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id),
  CONSTRAINT inspectores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.perfiles_ciudadanos(usuario_id),
  CONSTRAINT inspectores_tipo_turno_fkey FOREIGN KEY (tipo_turno) REFERENCES public.turno_tipo(id)
);
CREATE TABLE public.movil_tipo (
  id integer NOT NULL DEFAULT nextval('movil_tipo_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT movil_tipo_pkey PRIMARY KEY (id)
);
CREATE TABLE public.movil_uso_kilometraje (
  id bigint NOT NULL DEFAULT nextval('movil_uso_kilometraje_id_seq'::regclass),
  uso_id bigint NOT NULL,
  lectura_ts timestamp with time zone NOT NULL DEFAULT now(),
  kilometraje_km numeric NOT NULL CHECK (kilometraje_km >= 0::numeric),
  tipo character varying NOT NULL DEFAULT 'INTERMEDIA'::character varying CHECK (tipo::text = ANY (ARRAY['INICIO'::character varying, 'FIN'::character varying, 'INTERMEDIA'::character varying]::text[])),
  actor_user_id uuid,
  CONSTRAINT movil_uso_kilometraje_pkey PRIMARY KEY (id),
  CONSTRAINT movil_uso_kilometraje_uso_id_fkey FOREIGN KEY (uso_id) REFERENCES public.movil_usos(id),
  CONSTRAINT movil_uso_kilometraje_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.movil_usos (
  id bigint NOT NULL DEFAULT nextval('movil_usos_id_seq'::regclass),
  movil_id bigint NOT NULL,
  inspector_id integer NOT NULL,
  turno_id bigint,
  inicio_ts timestamp with time zone NOT NULL DEFAULT now(),
  fin_ts timestamp with time zone,
  km_recorridos numeric DEFAULT 0,
  observacion text,
  actor_user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT movil_usos_pkey PRIMARY KEY (id),
  CONSTRAINT movil_usos_movil_id_fkey FOREIGN KEY (movil_id) REFERENCES public.moviles(id),
  CONSTRAINT movil_usos_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.inspectores(id),
  CONSTRAINT movil_usos_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos(id),
  CONSTRAINT movil_usos_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.moviles (
  id bigint NOT NULL DEFAULT nextval('moviles_id_seq'::regclass),
  tipo_id integer NOT NULL,
  patente character varying NOT NULL UNIQUE,
  alias character varying,
  kilometraje_actual numeric NOT NULL DEFAULT 0,
  anio integer,
  marca character varying,
  modelo character varying,
  estado character varying NOT NULL DEFAULT 'DISPONIBLE'::character varying CHECK (estado::text = ANY (ARRAY['DISPONIBLE'::character varying, 'ASIGNADO'::character varying, 'MANTENCION'::character varying, 'FUERA_SERVICIO'::character varying]::text[])),
  activo boolean NOT NULL DEFAULT true,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT moviles_pkey PRIMARY KEY (id),
  CONSTRAINT moviles_tipo_id_fkey FOREIGN KEY (tipo_id) REFERENCES public.movil_tipo(id),
  CONSTRAINT moviles_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.notificaciones_enviadas (
  id integer NOT NULL DEFAULT nextval('notificaciones_enviadas_id_seq'::regclass),
  usuario_id uuid,
  tipo character varying NOT NULL,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notificaciones_enviadas_pkey PRIMARY KEY (id),
  CONSTRAINT notificaciones_enviadas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.perfiles_ciudadanos (
  usuario_id uuid NOT NULL,
  nombre character varying,
  email character varying,
  telefono character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  apellido character varying,
  avatar_url text,
  CONSTRAINT perfiles_ciudadanos_pkey PRIMARY KEY (usuario_id),
  CONSTRAINT perfiles_ciudadanos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.prioridades_denuncia (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre character varying NOT NULL UNIQUE,
  orden smallint NOT NULL,
  CONSTRAINT prioridades_denuncia_pkey PRIMARY KEY (id)
);
CREATE TABLE public.push_status_queue (
  id bigint NOT NULL DEFAULT nextval('push_status_queue_id_seq'::regclass),
  denuncia_id uuid NOT NULL,
  estado_anterior_id integer,
  estado_nuevo_id integer NOT NULL,
  destinatario_user_id uuid NOT NULL,
  via text NOT NULL DEFAULT 'EXPO'::text,
  payload jsonb,
  attempts integer NOT NULL DEFAULT 0,
  processed_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_status_queue_pkey PRIMARY KEY (id),
  CONSTRAINT push_status_queue_denuncia_id_fkey FOREIGN KEY (denuncia_id) REFERENCES public.denuncias(id),
  CONSTRAINT push_status_queue_estado_nuevo_id_fkey FOREIGN KEY (estado_nuevo_id) REFERENCES public.estados_denuncia(id),
  CONSTRAINT push_status_queue_destinatario_user_id_fkey FOREIGN KEY (destinatario_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.roles_portal (
  id integer NOT NULL DEFAULT nextval('roles_portal_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  CONSTRAINT roles_portal_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tokens_push (
  usuario_id uuid NOT NULL,
  device_id character varying NOT NULL,
  expo_token character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tokens_push_pkey PRIMARY KEY (usuario_id, device_id),
  CONSTRAINT tokens_push_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id)
);
CREATE TABLE public.turno_tipo (
  id integer NOT NULL DEFAULT nextval('turno_tipo_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  operador boolean NOT NULL DEFAULT false,
  inspector boolean NOT NULL DEFAULT true,
  hora_inicio time without time zone NOT NULL DEFAULT now(),
  hora_termino time without time zone NOT NULL DEFAULT now(),
  CONSTRAINT turno_tipo_pkey PRIMARY KEY (id)
);
CREATE TABLE public.turnos (
  id bigint NOT NULL DEFAULT nextval('turnos_id_seq'::regclass),
  inspector_id integer NOT NULL,
  fecha date NOT NULL,
  planificado_id bigint,
  estado character varying NOT NULL CHECK (estado::text = ANY (ARRAY['PENDIENTE'::character varying, 'EN_CURSO'::character varying, 'EN_PAUSA'::character varying, 'FINALIZADO'::character varying, 'CERRADO_AUTO'::character varying]::text[])),
  hora_inicio_real timestamp with time zone,
  hora_fin_real timestamp with time zone,
  minutos_colacion integer NOT NULL DEFAULT 0 CHECK (minutos_colacion >= 0 AND minutos_colacion < 1440),
  cuadrante_id integer,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT turnos_pkey PRIMARY KEY (id),
  CONSTRAINT turnos_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.inspectores(id),
  CONSTRAINT turnos_planificado_id_fkey FOREIGN KEY (planificado_id) REFERENCES public.turnos_planificados(id),
  CONSTRAINT turnos_cuadrante_id_fkey FOREIGN KEY (cuadrante_id) REFERENCES public.cuadrantes(id),
  CONSTRAINT turnos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.turnos_excepciones (
  id bigint NOT NULL DEFAULT nextval('turnos_excepciones_id_seq'::regclass),
  turno_planificado_id bigint NOT NULL,
  motivo character varying NOT NULL,
  anula boolean NOT NULL DEFAULT true,
  nuevo_inicio time without time zone,
  nuevo_fin time without time zone,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT turnos_excepciones_pkey PRIMARY KEY (id),
  CONSTRAINT turnos_excepciones_turno_planificado_id_fkey FOREIGN KEY (turno_planificado_id) REFERENCES public.turnos_planificados(id),
  CONSTRAINT turnos_excepciones_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.turnos_planificados (
  id bigint NOT NULL DEFAULT nextval('turnos_planificados_id_seq'::regclass),
  inspector_id integer NOT NULL,
  turno_tipo_id integer,
  fecha date NOT NULL,
  hora_inicio time without time zone NOT NULL,
  hora_fin time without time zone NOT NULL,
  cuadrante_id integer,
  creado_por uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT turnos_planificados_pkey PRIMARY KEY (id),
  CONSTRAINT turnos_planificados_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.inspectores(id),
  CONSTRAINT turnos_planificados_turno_tipo_id_fkey FOREIGN KEY (turno_tipo_id) REFERENCES public.turno_tipo(id),
  CONSTRAINT turnos_planificados_cuadrante_id_fkey FOREIGN KEY (cuadrante_id) REFERENCES public.cuadrantes(id),
  CONSTRAINT turnos_planificados_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES auth.users(id)
);
CREATE TABLE public.usuarios_portal (
  usuario_id uuid NOT NULL,
  rol_id integer NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_portal_pkey PRIMARY KEY (usuario_id),
  CONSTRAINT usuarios_portal_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id),
  CONSTRAINT usuarios_portal_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles_portal(id)
);