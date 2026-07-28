import {
    readFile,
    stat,
} from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
  
  const ROOT = process.cwd()
  
  const OUTPUT_CANDIDATES = [
    'dist/client',
    '.output/public',
    'dist/public',
    '.vercel/output/static',
    'build/client',
  ] as const
  
  const REQUIRED_FILES = [
    'sw.js',
    'manifest.webmanifest',
    'offline.html',
    'pwa-192x192.png',
    'pwa-512x512.png',
    'maskable-icon-512x512.png',
    'apple-touch-icon.png',
  ] as const
  
  async function main(): Promise<void> {
    const output =
      await resolveOutputDirectory()
  
    const missing: string[] = []
  
    for (const file of REQUIRED_FILES) {
      const value =
        path.resolve(output, file)
  
      if (!await fileExists(value)) {
        missing.push(file)
      }
    }
  
    if (missing.length > 0) {
      throw new Error(
        [
          'El build PWA está incompleto.',
          ...missing.map(
            (file) => `- ${file}`,
          ),
        ].join('\n'),
      )
    }
  
    const manifestPath =
      path.resolve(
        output,
        'manifest.webmanifest',
      )
  
    const manifest =
      JSON.parse(
        await readFile(
          manifestPath,
          'utf8',
        ),
      ) as {
        name?: unknown
        start_url?: unknown
        display?: unknown
        icons?: Array<{
          sizes?: string
          purpose?: string
        }>
      }
  
    if (
      typeof manifest.name !==
        'string' ||
      typeof manifest.start_url !==
        'string' ||
      typeof manifest.display !==
        'string'
    ) {
      throw new Error(
        'El manifest no contiene los campos básicos.',
      )
    }
  
    const sizes = new Set(
      manifest.icons?.map(
        (icon) => icon.sizes,
      ) ?? [],
    )
  
    if (
      !sizes.has('192x192') ||
      !sizes.has('512x512')
    ) {
      throw new Error(
        'El manifest debe incluir iconos 192x192 y 512x512.',
      )
    }
  
    const hasMaskable =
      manifest.icons?.some(
        (icon) =>
          icon.purpose
            ?.split(/\s+/)
            .includes('maskable'),
      ) ?? false
  
    if (!hasMaskable) {
      throw new Error(
        'El manifest no incluye un icono maskable.',
      )
    }
  
    const swSource =
      await readFile(
        path.resolve(output, 'sw.js'),
        'utf8',
      )
  
    if (
      swSource.includes(
        'self.__SW_MANIFEST',
      )
    ) {
      throw new Error(
        'El precache manifest no fue inyectado en sw.js.',
      )
    }
  
    console.log(
      [
        '[PWA] Verificación correcta.',
        `Directorio: ${path.relative(ROOT, output)}`,
        `Archivos: ${REQUIRED_FILES.length}`,
      ].join('\n'),
    )
  }
  
  async function resolveOutputDirectory():
    Promise<string> {
    const configured =
      process.env
        .PWA_CLIENT_OUT_DIR
  
    if (configured) {
      return path.resolve(
        ROOT,
        configured,
      )
    }
  
    for (
      const candidate
      of OUTPUT_CANDIDATES
    ) {
      const value =
        path.resolve(
          ROOT,
          candidate,
        )
  
      if (
        await directoryExists(value)
      ) {
        return value
      }
    }
  
    throw new Error(
      'No se encontró el directorio cliente.',
    )
  }
  
  async function directoryExists(
    value: string,
  ): Promise<boolean> {
    try {
      return (
        await stat(value)
      ).isDirectory()
    } catch {
      return false
    }
  }
  
  async function fileExists(
    value: string,
  ): Promise<boolean> {
    try {
      return (
        await stat(value)
      ).isFile()
    } catch {
      return false
    }
  }
  
  main().catch((error) => {
    console.error(
      '[PWA] La verificación falló.',
    )
    console.error(error)
    process.exitCode = 1
  })
  