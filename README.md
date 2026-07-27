# Personal Productivity OS — Autenticación Turso v1.0

Implementación integrada de las antiguas Fases 01 y 02, migrada de PostgreSQL a:

- Turso Cloud
- libSQL
- Drizzle ORM
- Better Auth
- TanStack Start
- Dexie

## Alcance

Incluye:

- registro con correo y contraseña;
- inicio y cierre de sesión;
- Better Auth con adaptador Drizzle para SQLite;
- Turso como base remota;
- endpoint `/api/auth/*`;
- registro remoto de dispositivos;
- identidad local en Dexie;
- acceso offline después de una autenticación satisfactoria;
- reautenticación cuando la sesión remota expire;
- cierre de sesión incluso cuando no existe conexión;
- rutas `_auth` y `_app` con `ssr: false`;
- validación Zod;
- pruebas unitarias de la política de acceso.

## Arquitectura

```text
React
  ↓
Dexie / IndexedDB
  ↓
Identidad y acceso local
  ↓
Server Functions / Better Auth
  ↓
Drizzle ORM
  ↓
Turso Cloud / libSQL
```

Turso no reemplaza Dexie. Turso es la persistencia remota; Dexie sigue siendo la base operativa del navegador.

---

## 1. Dependencias

Si vienes de la versión PostgreSQL:

```bash
pnpm remove postgres
pnpm add @libsql/client
```

Instalación completa:

```bash
pnpm add \
  better-auth \
  @better-auth/drizzle-adapter \
  drizzle-orm \
  @libsql/client \
  dexie \
  zod \
  @tanstack/react-form

pnpm add -D drizzle-kit dotenv vitest
```

---

## 2. Crear la base Turso

Instala e inicia sesión con Turso CLI y crea una base.

Ejemplo:

```bash
turso db create personal-productivity-os
turso db show --url personal-productivity-os
turso db tokens create personal-productivity-os
```

Coloca la URL y token en `.env`.

---

## 3. Variables de entorno

Copia `.env.example` como `.env`.

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
APP_ORIGIN=http://localhost:3000
```

El token de Turso solo puede utilizarse en servidor.

---

## 4. Regenerar el esquema Better Auth

El paquete incluye un esquema SQLite funcional. Sin embargo, Better Auth puede modificar sus tablas entre versiones.

Después de instalar las dependencias, regenera el esquema con la versión instalada:

```bash
pnpm dlx auth@latest generate \
  --config ./src/server/auth/auth.server.ts \
  --output ./src/server/database/schema/auth.schema.ts \
  --yes
```

PowerShell:

```powershell
pnpm dlx auth@latest generate --config ./src/server/auth/auth.server.ts --output ./src/server/database/schema/auth.schema.ts --yes
```

Revisa que `device.schema.ts` continúe exportado desde `schema/index.ts`.

---

## 5. Migraciones Drizzle

Para una migración limpia desde la versión PostgreSQL y sin datos importantes:

1. conserva una copia del código anterior;
2. elimina las migraciones PostgreSQL generadas;
3. usa los esquemas SQLite de este paquete;
4. genera nuevas migraciones;
5. aplícalas a Turso.

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

También puedes usar:

```bash
pnpm drizzle-kit push
```

solo durante prototipado local. Para el proyecto principal se recomiendan migraciones versionadas.

---

## 6. Orden de integración

1. `env.server.ts`
2. `drizzle.config.ts`
3. `server/database`
4. `server/auth`
5. `routes/api/auth`
6. `platform/auth`
7. `platform/database`
8. `server/devices`
9. formularios Identity
10. rutas `_auth` y `_app`
11. layouts
12. migraciones
13. pruebas

---

## 7. Estados de acceso

```text
remote_authenticated
local_offline
local_remote_unavailable
reauthentication_required
unauthenticated
```

### Sesión remota válida

```text
canEnterApp      = true
canSynchronize   = true
```

### Dispositivo inicializado sin conexión

```text
canEnterApp      = true
canSynchronize   = false
```

### Sesión remota expirada

```text
canEnterApp              = true
canSynchronize           = false
requiresReauthentication = true
```

### Sin sesión ni identidad local

```text
canEnterApp = false
redirect    = /login
```

---

## 8. Cierre de sesión offline

Si el usuario cierra sesión sin conexión:

1. se deshabilita el acceso local;
2. se elimina el perfil activo;
3. se registra `remoteSignOutPending`;
4. cuando el servidor vuelva a estar disponible, se invalida la cookie remota;
5. la sesión remota no puede volver a habilitar automáticamente el dispositivo.

Los datos del dominio no se eliminan.

---

## 9. Verificación

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Prueba:

1. registrar cuenta;
2. entrar al dashboard;
3. confirmar el dispositivo en Turso;
4. desconectar Internet;
5. recargar `/dashboard`;
6. comprobar acceso local;
7. volver a conectar;
8. cerrar sesión;
9. confirmar redirección a `/login`.

---

## 10. Siguiente fase

Después de integrar y validar esta versión:

```text
Fase 03
└── Tasks local-first
    ├── tabla Dexie
    ├── dominio Task
    ├── repositorio local
    ├── casos de uso
    ├── consultas reactivas
    └── Sync Queue
```
