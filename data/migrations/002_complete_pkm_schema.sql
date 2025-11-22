-- ============================================================================
-- Migración completa del modelo de datos físico para PKM (Personal Knowledge Management)
-- Integra: Frontend (fe-webapp), RAG (rag_memory) y especificaciones (SPECS.md)
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Para búsqueda full-text mejorada

-- ============================================================================
-- TABLAS DE USUARIOS Y AUTENTICACIÓN
-- ============================================================================

-- Tabla de usuarios (preparada para autenticación futura)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255),
    
    -- Plan y límites (según modelo freemium)
    plan            VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
    notes_limit     INTEGER DEFAULT 100,  -- Límite mensual de notas
    storage_limit   BIGINT DEFAULT 1073741824,  -- 1GB en bytes
    
    -- Métricas de uso
    notes_count_current_month INTEGER DEFAULT 0,
    storage_used    BIGINT DEFAULT 0,  -- En bytes
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_plan ON users (plan);

COMMENT ON TABLE users IS 'Usuarios del sistema con límites según plan (free/pro/team)';
COMMENT ON COLUMN users.plan IS 'Plan del usuario: free (100 notas/mes, 1GB), pro (ilimitado), team (colaboración)';

-- ============================================================================
-- TABLAS DE PROYECTOS/ESPACIOS
-- ============================================================================

-- Tabla de proyectos/espacios de trabajo
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    color           VARCHAR(7),  -- Color hex (#RRGGBB)
    icon            VARCHAR(50),  -- Nombre del icono
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_project_user_name UNIQUE (user_id, name)
);

CREATE INDEX idx_projects_user_id ON projects (user_id);
CREATE INDEX idx_projects_created_at ON projects (created_at DESC);

COMMENT ON TABLE projects IS 'Proyectos/espacios de trabajo para organizar notas por contexto';

-- ============================================================================
-- TABLAS DE NOTAS (conectadas con RAG memories)
-- ============================================================================

-- Tabla principal de notas
CREATE TABLE IF NOT EXISTS notes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Contenido
    title           VARCHAR(500) NOT NULL,
    content         TEXT NOT NULL,
    
    -- Estado y organización
    is_pinned       BOOLEAN DEFAULT FALSE,
    
    -- Relación con RAG memory (opcional, puede ser NULL si no se ha procesado)
    memory_id       INTEGER,  -- Se conectará con memory.id cuando se procese
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar foreign key a memory si la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory') THEN
        -- Verificar si la constraint ya existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_notes_memory' AND table_name = 'notes'
        ) THEN
            ALTER TABLE notes 
            ADD CONSTRAINT fk_notes_memory 
            FOREIGN KEY (memory_id) REFERENCES memory(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

CREATE INDEX idx_notes_user_id ON notes (user_id);
CREATE INDEX idx_notes_project_id ON notes (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_notes_created_at ON notes (created_at DESC);
CREATE INDEX idx_notes_updated_at ON notes (updated_at DESC);
CREATE INDEX idx_notes_is_pinned ON notes (is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_notes_memory_id ON notes (memory_id) WHERE memory_id IS NOT NULL;

-- Índice GIN para búsqueda full-text en título y contenido
CREATE INDEX idx_notes_content_gin ON notes USING GIN (to_tsvector('spanish', title || ' ' || content));
CREATE INDEX idx_notes_title_trgm ON notes USING GIN (title gin_trgm_ops);
CREATE INDEX idx_notes_content_trgm ON notes USING GIN (content gin_trgm_ops);

COMMENT ON TABLE notes IS 'Notas del usuario, conectadas con memories del RAG para búsqueda semántica';
COMMENT ON COLUMN notes.memory_id IS 'ID de la memoria RAG asociada (NULL si aún no se ha procesado)';

-- ============================================================================
-- TABLAS DE TAGS
-- ============================================================================

-- Tabla de tags (globales por usuario)
CREATE TABLE IF NOT EXISTS tags (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    color           VARCHAR(7),  -- Color opcional para el tag
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_tag_user_name UNIQUE (user_id, name)
);

CREATE INDEX idx_tags_user_id ON tags (user_id);
CREATE INDEX idx_tags_name_trgm ON tags USING GIN (name gin_trgm_ops);

COMMENT ON TABLE tags IS 'Tags para categorizar notas (many-to-many con notes)';

-- Tabla de relación many-to-many entre notas y tags
CREATE TABLE IF NOT EXISTS note_tags (
    note_id         UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT pk_note_tags PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_note_tags_note_id ON note_tags (note_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags (tag_id);

COMMENT ON TABLE note_tags IS 'Relación many-to-many entre notas y tags';

-- ============================================================================
-- TABLAS DE BACKLINKS (conexiones entre notas)
-- ============================================================================

-- Tabla de backlinks (conexiones bidireccionales entre notas)
CREATE TABLE IF NOT EXISTS note_backlinks (
    source_note_id  UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_note_id  UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT pk_note_backlinks PRIMARY KEY (source_note_id, target_note_id),
    CONSTRAINT chk_no_self_backlinks CHECK (source_note_id != target_note_id)
);

CREATE INDEX idx_note_backlinks_source ON note_backlinks (source_note_id);
CREATE INDEX idx_note_backlinks_target ON note_backlinks (target_note_id);

COMMENT ON TABLE note_backlinks IS 'Conexiones bidireccionales entre notas (wiki-style links)';

-- ============================================================================
-- TABLAS DE TRANSCRIPCIONES DE AUDIO
-- ============================================================================

-- Tabla de transcripciones de audio
CREATE TABLE IF NOT EXISTS audio_transcriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id         UUID REFERENCES notes(id) ON DELETE SET NULL,
    
    -- Audio
    audio_url       TEXT,  -- URL del archivo de audio (S3, storage, etc.)
    audio_file_name VARCHAR(255),
    audio_file_size BIGINT,  -- Tamaño en bytes
    duration        INTEGER,  -- Duración en segundos
    
    -- Transcripción
    text            TEXT NOT NULL,
    language        VARCHAR(10) DEFAULT 'es',  -- Código de idioma (es, en, etc.)
    
    -- Metadata
    source          VARCHAR(50) DEFAULT 'whisper',  -- whisper, manual, etc.
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT fk_audio_transcriptions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_audio_transcriptions_note FOREIGN KEY (note_id) 
        REFERENCES notes(id) ON DELETE SET NULL
);

CREATE INDEX idx_audio_transcriptions_user_id ON audio_transcriptions (user_id);
CREATE INDEX idx_audio_transcriptions_note_id ON audio_transcriptions (note_id) WHERE note_id IS NOT NULL;
CREATE INDEX idx_audio_transcriptions_created_at ON audio_transcriptions (created_at DESC);

COMMENT ON TABLE audio_transcriptions IS 'Transcripciones de audio generadas con Whisper u otros servicios';

-- ============================================================================
-- TABLAS DE TEMPLATES
-- ============================================================================

-- Tabla de templates de notas
CREATE TABLE IF NOT EXISTS note_templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    
    -- Template
    name            VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,  -- Contenido del template con placeholders
    
    -- Metadata
    is_default      BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT uq_template_user_name UNIQUE (user_id, name)
);

CREATE INDEX idx_note_templates_user_id ON note_templates (user_id);
CREATE INDEX idx_note_templates_project_id ON note_templates (project_id) WHERE project_id IS NOT NULL;

COMMENT ON TABLE note_templates IS 'Templates reutilizables para crear notas rápidamente';

-- ============================================================================
-- EXTENSIÓN DE TABLAS RAG (memory) PARA CONECTAR CON NOTAS
-- ============================================================================

-- Agregar campos a la tabla memory para conectar con notas y usuarios
-- (Solo si la tabla memory ya existe, si no, se creará en la migración RAG)
DO $$
BEGIN
    -- Agregar user_id a memory si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memory' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE memory ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        CREATE INDEX idx_memory_user_id ON memory (user_id) WHERE user_id IS NOT NULL;
    END IF;
    
    -- Agregar note_id a memory si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memory' AND column_name = 'note_id'
    ) THEN
        ALTER TABLE memory ADD COLUMN note_id UUID REFERENCES notes(id) ON DELETE SET NULL;
        CREATE INDEX idx_memory_note_id ON memory (note_id) WHERE note_id IS NOT NULL;
    END IF;
    
    -- Agregar source_type para distinguir el origen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'memory' AND column_name = 'source_type'
    ) THEN
        ALTER TABLE memory ADD COLUMN source_type VARCHAR(50) DEFAULT 'note';
        CREATE INDEX idx_memory_source_type ON memory (source_type);
    END IF;
END $$;

COMMENT ON COLUMN memory.user_id IS 'Usuario propietario de la memoria (para multi-tenancy)';
COMMENT ON COLUMN memory.note_id IS 'Nota asociada a esta memoria (si proviene de una nota)';
COMMENT ON COLUMN memory.source_type IS 'Tipo de origen: note, transcription, manual, etc.';

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_templates_updated_at BEFORE UPDATE ON note_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar contador de notas del proyecto
CREATE OR REPLACE FUNCTION update_project_note_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Incrementar contador
        UPDATE projects 
        SET updated_at = NOW()
        WHERE id = NEW.project_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrementar contador
        UPDATE projects 
        SET updated_at = NOW()
        WHERE id = OLD.project_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Si cambió el proyecto
        IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
            UPDATE projects SET updated_at = NOW() WHERE id = OLD.project_id;
            UPDATE projects SET updated_at = NOW() WHERE id = NEW.project_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_note_count
    AFTER INSERT OR UPDATE OR DELETE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_project_note_count();

-- Función para actualizar contador de notas del usuario (mensual)
CREATE OR REPLACE FUNCTION update_user_notes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE users 
        SET notes_count_current_month = notes_count_current_month + 1,
            updated_at = NOW()
        WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users 
        SET notes_count_current_month = GREATEST(0, notes_count_current_month - 1),
            updated_at = NOW()
        WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_notes_count
    AFTER INSERT OR DELETE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_user_notes_count();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista de notas con información completa
CREATE OR REPLACE VIEW notes_full AS
SELECT 
    n.id,
    n.user_id,
    n.project_id,
    p.name AS project_name,
    p.color AS project_color,
    n.title,
    n.content,
    n.is_pinned,
    n.memory_id,
    n.created_at,
    n.updated_at,
    -- Tags como array
    COALESCE(
        array_agg(DISTINCT t.name ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL),
        ARRAY[]::VARCHAR[]
    ) AS tags,
    -- Backlinks count
    (SELECT COUNT(*) FROM note_backlinks WHERE target_note_id = n.id) AS backlinks_count,
    -- Similar notes count (via memory edges)
    (SELECT COUNT(*) FROM memory_edge me 
     JOIN notes n2 ON n2.memory_id = me.target_id 
     WHERE me.source_id = n.memory_id AND n2.id != n.id) AS similar_notes_count
FROM notes n
LEFT JOIN projects p ON n.project_id = p.id
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
GROUP BY n.id, n.user_id, n.project_id, p.name, p.color, n.title, n.content, 
         n.is_pinned, n.memory_id, n.created_at, n.updated_at;

COMMENT ON VIEW notes_full IS 'Vista completa de notas con proyectos, tags y estadísticas';

-- Vista de transcripciones con información de notas
CREATE OR REPLACE VIEW audio_transcriptions_full AS
SELECT 
    at.id,
    at.user_id,
    at.note_id,
    n.title AS note_title,
    at.audio_url,
    at.audio_file_name,
    at.audio_file_size,
    at.duration,
    at.text,
    at.language,
    at.source,
    at.created_at
FROM audio_transcriptions at
LEFT JOIN notes n ON at.note_id = n.id;

COMMENT ON VIEW audio_transcriptions_full IS 'Vista completa de transcripciones con información de notas asociadas';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Preparado para multi-tenancy
-- ============================================================================
-- NOTA: Las políticas RLS están comentadas por defecto.
-- Descomenta y ajusta según tu sistema de autenticación (Supabase, custom, etc.)

-- Habilitar RLS en todas las tablas de usuario
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE note_backlinks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audio_transcriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE memory ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS RLS PARA SUPABASE AUTH (descomenta si usas Supabase)
-- ============================================================================
-- Estas políticas asumen que usas Supabase Auth con auth.uid()
-- Ajusta según tu sistema de autenticación

/*
-- Política para users: Los usuarios solo pueden ver su propio registro
CREATE POLICY users_isolation ON users
    FOR ALL
    USING (auth.uid() = id::text);

-- Política para projects: Los usuarios solo pueden ver sus propios proyectos
CREATE POLICY projects_isolation ON projects
    FOR ALL
    USING (auth.uid() = user_id::text);

-- Política para notes: Los usuarios solo pueden ver sus propias notas
CREATE POLICY notes_isolation ON notes
    FOR ALL
    USING (auth.uid() = user_id::text);

-- Política para tags: Los usuarios solo pueden ver sus propios tags
CREATE POLICY tags_isolation ON tags
    FOR ALL
    USING (auth.uid() = user_id::text);

-- Política para note_tags: Basada en la nota
CREATE POLICY note_tags_isolation ON note_tags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM notes n 
            WHERE n.id = note_tags.note_id 
            AND n.user_id::text = auth.uid()
        )
    );

-- Política para note_backlinks: Basada en las notas
CREATE POLICY note_backlinks_isolation ON note_backlinks
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM notes n 
            WHERE n.id = note_backlinks.source_note_id 
            AND n.user_id::text = auth.uid()
        )
    );

-- Política para audio_transcriptions: Los usuarios solo pueden ver sus propias transcripciones
CREATE POLICY audio_transcriptions_isolation ON audio_transcriptions
    FOR ALL
    USING (auth.uid() = user_id::text);

-- Política para note_templates: Los usuarios solo pueden ver sus propios templates
CREATE POLICY note_templates_isolation ON note_templates
    FOR ALL
    USING (auth.uid() = user_id::text);

-- Política para memory: Los usuarios solo pueden ver sus propias memorias
CREATE POLICY memory_isolation ON memory
    FOR ALL
    USING (auth.uid() = user_id::text);
*/

-- ============================================================================
-- POLÍTICAS RLS ALTERNATIVAS (para sistemas de autenticación custom)
-- ============================================================================
-- Si usas un sistema de autenticación custom, puedes usar estas políticas
-- que asumen que tienes una función current_user_id() que retorna el UUID del usuario actual

/*
-- Ejemplo para sistema custom:
CREATE POLICY notes_isolation_custom ON notes
    FOR ALL
    USING (user_id = current_user_id());
*/

-- ============================================================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO
-- ============================================================================

-- Índice compuesto para búsqueda de notas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_notes_user_updated_at 
    ON notes (user_id, updated_at DESC);

-- Índice compuesto para búsqueda de notas por proyecto y fecha
CREATE INDEX IF NOT EXISTS idx_notes_project_updated_at 
    ON notes (project_id, updated_at DESC) WHERE project_id IS NOT NULL;

-- Índice para búsqueda de notas recientes
CREATE INDEX IF NOT EXISTS idx_notes_user_recent 
    ON notes (user_id, created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON SCHEMA public IS 'Esquema principal del sistema PKM con soporte para notas, RAG, transcripciones y multi-tenancy';

