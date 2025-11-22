

# Reglas basicas

- Ningun archivo puede medir mas de 300 lineas de codigo
- Para usar la librería de supabase usaremos siempre un singleton 
- NO STATIC FALLBACKS
- NO HARDCODED VALUES
- Resptar siempre KISS, YAGNI y DRY
- SIEMPRE que algun archivo super las 290 licnes de codigo, se debe pensar en hacer un descomposicion funcional en varios archivos, que mantenga el fondo y forma del objetivo del coigo pero adeicionalmente pueda reflejar todo el esfuerzo de mantener un codigo limpio y TOKEN OPTIMIZED.


# Webapp

- Esta es una aplicación para gerar conocimiento personal de un individuo humano y ser un Segundo Cerebro digital optimizado por AI.
- La webapp tiene  un dashbpard principal
- La web app tiene un modo graph como obsidian, donde cada nodo es un cluster de informacion.
- El sidebar permite navegar en la inteligincia de la persona y al final tiene una sección de configuracion de la aplicacion 
- Los 3 pilares imporantes para nosotros son:
    1. Desarrollo de Carrera
    2. Social
    3. Hobby
- El usuario puede incluir notas, estas notas tienes tags, estos tags ó etiquetas, son precisamente una manera de categorización.
- Las notas son en formato  markdown, con extensión `.md`, pero se puede descargar, visualizar (preview mode) y compartir.
- 



# Flujos de usuario

- El usuario llega desde el chat desde la web publica.
- Tenemos dos modos 
    a. Modo consulta
    b. Modo nota

- Cuando un user abre un archivo lo puede abrir en una nueva pestaña o en la pagina actual de edicion de ntoas.
-


# Stack

- Para la aplicacion en frontend usaremos nextjs 15.5.6, SHADCN, taildwind 3 (NO usar taildwind 4) 
- Para el backend se conectar con servicios de NextJS en la carpeta `services` dentro del proyecto `fe-webapp`. 

