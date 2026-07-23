# Cotidiana — Documentación técnica

Aplicación personal de gestión de horario, tareas, alarmas y lectura.

---

## 1. Resumen del proyecto

Cotidiana es una aplicación web personal (single-user) para organizar el día a día: bloques de horario (fijos, recurrentes o únicos), tareas asociadas, alarmas con notificaciones push reales, y un gestor de lectura de libros. La aplicación nace como MVP local-first y evoluciona en fases hacia integración con IA vía MCP, y finalmente hacia PWA/offline completo.

**Principio de diseño:** mantener el código en inglés (nombres de archivos, variables, funciones, columnas de base de datos) y los textos visibles al usuario en español, embebidos directamente sin capa de i18n.

---

## 2. Stack tecnológico

| Capa | Tecnología | Rol |
|---|---|---|
| Framework | TanStack Start | SSR, routing, server functions |
| Estado reactivo cliente | TanStack DB | Colecciones locales, live queries |
| Sincronización servidor | TanStack Query | Caché, mutaciones, invalidación |
| Formularios | TanStack Form + Zod | Formularios y validación compartida cliente/servidor |
| Colas / rate-limiting | TanStack Pacer | Debounce en edición, cola de envío de alarmas |
| Base de datos | Turso (libSQL/SQLite) + réplicas embebidas | Persistencia local-first |
| ORM | Drizzle (dialecto SQLite) | Acceso tipado a la base de datos |
| Notificaciones | Web Push API + Service Worker | Alarmas que funcionan con la app cerrada |
| Scheduler/cron | Upstash QStash | Disparo periódico de revisión de alarmas |
| UI | shadcn/ui | Componentes base, 100% responsive |
| Tipografía | Fraunces (encabezados) + Plus Jakarta Sans (cuerpo/UI) | Identidad visual |
| Colores | Coral (acento principal), Teal (lectura), Amber (alarmas) | Paleta de marca |
| Autenticación | Better Auth | Sesión y protección de rutas/servidor |

---

## 3. Arquitectura de carpetas (Feature-Sliced Design)

```
src/
├── app/                        # Configuración raíz, providers, router
├── routes/                     # Rutas TanStack Start (file-based)
│   ├── __root.tsx
│   ├── index.tsx                # Dashboard del día
│   ├── schedule/
│   │   ├── index.tsx
│   │   ├── $blockId.tsx
│   │   └── new.tsx
│   ├── reading/
│   │   ├── index.tsx
│   │   └── $bookId.tsx
│   ├── alarms/
│   │   └── index.tsx
│   ├── settings/
│   │   └── index.tsx
│   └── api/
│       ├── cron/
│       │   └── check-alarms.ts   # Endpoint invocado por QStash
│       └── mcp/
│           └── [transport].ts    # Endpoint del servidor MCP (Fase 1.1)
├── widgets/                     # Composiciones grandes (Calendario, Panel diario)
├── features/
│   ├── schedule-block/
│   │   └── ui/ScheduleBlockForm.tsx
│   ├── task-completion/
│   ├── reading-tracker/
│   │   └── ui/BookForm.tsx
│   └── alarms/
│       └── ui/AlarmSettingsForm.tsx
├── entities/
│   ├── schedule-block/
│   ├── task/
│   ├── book/
│   └── push-subscription/
└── shared/
    ├── ui/                       # shadcn/ui + componentes propios
    ├── lib/
    │   ├── auth/
    │   │   └── client.ts         # Configuración de Better Auth
    │   ├── db/
    │   │   ├── client.ts         # Cliente libSQL + réplica embebida
    │   │   └── schema.ts         # Drizzle schema
    │   └── pacer/                # Configuración de colas/debounce
    └── api/                      # Server functions compartidas

routes/
└── api/
    └── auth/
        └── [...all].ts           # Handler de Better Auth
```

---

## 4. Modelo de datos (Drizzle, dialecto SQLite)

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const scheduleBlock = sqliteTable("schedule_block", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  startTime: text("start_time").notNull(),       // "HH:mm"
  endTime: text("end_time").notNull(),            // "HH:mm"
  type: text("type", { enum: ["fijo", "recurrente", "unico"] }).notNull(),
  color: text("color"),
  recurrenceDays: text("recurrence_days"),         // JSON: ["mon","wed"]
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const task = sqliteTable("task", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  scheduleBlockId: text("schedule_block_id").references(() => scheduleBlock.id),
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const book = sqliteTable("book", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  author: text("author"),
  status: text("status", { enum: ["por_leer", "leyendo", "terminado"] }).notNull(),
  currentPage: integer("current_page").default(0),
  totalPages: integer("total_pages"),
});

export const alarmSetting = sqliteTable("alarm_setting", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: text("task_id").references(() => task.id),
  scheduleBlockId: text("schedule_block_id").references(() => scheduleBlock.id),
  type: text("type", { enum: ["sonido", "push"] }).notNull(),
  offsetMinutes: integer("offset_minutes").default(0),
});

export const pushSubscription = sqliteTable("push_subscription", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
```

---

## 5. Cliente de base de datos (Turso)

```ts
// shared/lib/db/client.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: "file:local.db",            // réplica local
  syncUrl: process.env.TURSO_URL,   // base remota en Turso
  authToken: process.env.TURSO_TOKEN,
});

export const db = drizzle(client);
```

---

## 6. Autenticación (Better Auth)

Se usa **Better Auth**, consistente con el patrón ya aplicado en otros proyectos (UUID en `text` generado en aplicación para las entidades principales, alineado con el esquema que Better Auth espera).

### 6.1 Tablas requeridas por Better Auth (dialecto SQLite)

```ts
export const user = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
});
```

### 6.2 Relación con las entidades existentes

Al ser una app de un solo usuario, las entidades principales (`schedule_block`, `task`, `book`, `push_subscription`) deben referenciar `userId` para dejar la puerta abierta a un futuro multiusuario, aunque el MVP no lo explote:

```ts
export const scheduleBlock = sqliteTable("schedule_block", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => user.id),
  // ...resto de columnas igual que la sección 4
});
```

### 6.3 Protección de rutas y del endpoint MCP

- Las rutas de `routes/schedule`, `routes/reading`, `routes/alarms` y `routes/settings` deben validar la sesión de Better Auth en el *loader* o middleware de TanStack Start.
- El endpoint MCP (`routes/api/mcp/[transport].ts`, sección 10) también debe validar la sesión antes de ejecutar cualquier tool, ya que expone capacidad de escritura sobre los datos del usuario.

## 7. Flujo de alarmas (Web Push + QStash)

```
1. Usuario abre la app → se registra el Service Worker
   → el navegador genera una "push subscription"
   → se guarda en push_subscription

2. QStash invoca /api/cron/check-alarms cada minuto
   → consulta Turso: alarmas próximas a dispararse
   → TanStack Pacer pone en cola los envíos (evita saturar el proveedor de push)

3. Servidor envía el push vía Web Push API
   → el Service Worker del navegador lo recibe
   → muestra la notificación (sonido/vibración) aunque la pestaña esté cerrada
```

**Consideración de plataforma:** si despliega en Cloudflare Workers, mantener el endpoint `/api/cron/check-alarms` ligero (una sola consulta filtrada por rango de tiempo) por los límites de CPU time por request.

---

## 8. Convenciones de formularios

- TanStack Form + Zod como esquema de validación único, compartido entre cliente (formulario) y servidor (server function), para no duplicar reglas.
- Mensajes de validación en español, directamente en el esquema (sin capa de i18n):

```ts
const scheduleBlockSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  startTime: z.string().min(1, "La hora de inicio es obligatoria"),
  endTime: z.string().min(1, "La hora de fin es obligatoria"),
});
```

---

## 9. Sistema de diseño

| Elemento | Valor |
|---|---|
| Color principal (bloques activos, CTA) | Coral |
| Color secundario (módulo de lectura) | Teal |
| Color de alarmas/avisos | Amber |
| Encabezados | Fraunces, 500 |
| Cuerpo / UI | Plus Jakarta Sans, 400/500 |
| Componentes base | shadcn/ui |
| Responsive | 100%, mobile-first |

---

## 10. Fase 1.1 — Integración MCP y módulo de IA embebido

**Objetivo:** exponer un servidor MCP propio para que un cliente de IA (Claude u otro) pueda gestionar el horario de Cotidiana en lenguaje natural, reutilizando la misma lógica de negocio que ya usan las rutas/formularios.

### 10.1 Arquitectura compartida: tools, MCP y asistente embebido

La clave de esta fase es que **MCP (para clientes de IA externos) y el módulo de IA embebido dentro de Cotidiana comparten las mismas definiciones de "tools"**, para no duplicar lógica de negocio en varios lugares.

```
shared/
├── ai-tools/                     # Definición única de capacidades, consumida por ambos
│   ├── create-schedule-block.ts
│   ├── list-schedule-blocks.ts
│   ├── complete-task.ts
│   ├── add-book.ts
│   └── update-reading-progress.ts

routes/api/
├── mcp/
│   └── [transport].ts             # Servidor MCP → clientes externos (Claude Desktop, Claude Code)
└── assistant/
    └── chat.ts                     # Endpoint del asistente embebido → usa Messages API + tool use

features/
└── ai-assistant/
    └── ui/
        └── AssistantBar.tsx        # Barra de lenguaje natural dentro de Cotidiana
```

### 10.2 Arquitectura del servidor MCP

El servidor MCP se implementa como un endpoint adicional dentro del mismo proyecto TanStack Start (`routes/api/mcp/[transport].ts`), reutilizando las *server functions* existentes en `shared/api/` en vez de duplicar lógica. Esto evita tener dos fuentes de verdad para "crear un bloque de horario": una para la UI y otra para la IA.

```
routes/api/mcp/
└── [transport].ts       # Handler MCP (streamable HTTP)

shared/mcp/
├── server.ts             # Definición del servidor MCP y registro de tools
└── tools/
    ├── create-schedule-block.ts
    ├── list-schedule-blocks.ts
    ├── complete-task.ts
    ├── add-book.ts
    └── update-reading-progress.ts
```

### 10.3 Herramientas (tools) propuestas para el servidor MCP

| Tool | Descripción | Reutiliza |
|---|---|---|
| `create_schedule_block` | Crea un bloque de horario (título, hora inicio/fin, tipo, recurrencia) | Server function de `schedule-block` |
| `list_schedule_blocks` | Lista los bloques de un día o rango de fechas | Query existente de `schedule-block` |
| `complete_task` | Marca una tarea como completada | Server function de `task-completion` |
| `add_book` | Agrega un libro al gestor de lectura | Server function de `book` |
| `update_reading_progress` | Actualiza la página actual de un libro | Server function de `book` |

### 10.4 Ejemplo conceptual de definición de una tool

```ts
// shared/mcp/tools/create-schedule-block.ts
import { z } from "zod";
import { createScheduleBlockServerFn } from "@/features/schedule-block/api";

export const createScheduleBlockTool = {
  name: "create_schedule_block",
  description: "Crea un nuevo bloque de horario en Cotidiana",
  inputSchema: z.object({
    title: z.string(),
    startTime: z.string().describe("Formato HH:mm"),
    endTime: z.string().describe("Formato HH:mm"),
    type: z.enum(["fijo", "recurrente", "unico"]),
    recurrenceDays: z.array(z.string()).optional(),
  }),
  handler: async (input) => {
    const block = await createScheduleBlockServerFn(input);
    return { content: [{ type: "text", text: `Bloque "${block.title}" creado.` }] };
  },
};
```

### 10.5 Consideraciones de seguridad

- El endpoint MCP debe protegerse con autenticación (reutilizar Better Auth si se incorpora), ya que expone la capacidad de crear/modificar datos.
- Al ser una app de un solo usuario, un token estático o sesión propia es suficiente; no requiere OAuth multi-tenant.

### 10.6 Cómo se probará

- Uso del skill `mcp-builder` como referencia de buenas prácticas al construir el servidor.
- Prueba inicial conectando el servidor MCP desde Claude Desktop o Claude Code antes de exponerlo en producción.

---

### 10.7 Módulo de IA embebido (asistente dentro de Cotidiana)

A diferencia de MCP (que expone Cotidiana a clientes de IA *externos*), este módulo vive **dentro** de la propia aplicación: una barra o chat donde el usuario escribe en lenguaje natural y Cotidiana responde/actúa directamente.

**Implementación:** usa la Messages API de Anthropic con *tool use*, registrando las mismas tools de `shared/ai-tools/` que consume el servidor MCP.

```ts
// routes/api/assistant/chat.ts (server function)
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: userInput }],
  tools: aiTools.map(toAnthropicToolSchema), // mismas tools que el servidor MCP
});
// Si el modelo solicita ejecutar una tool, se invoca el handler compartido en shared/ai-tools/
```

**Casos de uso previstos:**
- Barra de "agenda rápida" en lenguaje natural (evita llenar el formulario completo para crear un bloque).
- Resumen diario generado a partir de los bloques y tareas del día.
- Sugerencias al detectar bloques de horario solapados.

**Por qué se documenta ahora pero se construye en Fase 1.1:** comparte toda la infraestructura de `shared/ai-tools/` con MCP, así que construirlo antes de tener el MCP listo generaría trabajo duplicado. Al desarrollarse en conjunto, ambos módulos avanzan con el mismo esfuerzo.

## 11. Roadmap por fases

| Fase | Alcance |
|---|---|
| **1.0 (MVP)** | Dashboard, horario, tareas, lectura, alarmas con push real, QStash, diseño aplicado |
| **1.1** | Servidor MCP (sección 10) y módulo de IA embebido dentro de Cotidiana, ambos compartiendo `shared/ai-tools/` |
| **1.2** | PWA completa y soporte offline extendido (ya parcialmente cubierto por réplicas embebidas de Turso) |

---

## 12. Notas para desarrollo asistido por IA

- Todo nombre de archivo, variable, función y columna de base de datos debe redactarse en inglés.
- Todo texto visible al usuario (labels, botones, mensajes de validación, contenido de notificaciones push) debe redactarse en español, embebido directamente sin capa de i18n.
- Las *server functions* deben ser la única fuente de lógica de negocio, reutilizada tanto por las rutas UI como por las tools MCP (Fase 1.1), para evitar lógica duplicada.
