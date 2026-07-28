import {
    cp,
    mkdir,
    rm,
    stat,
} from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
  
  import { injectManifest } from '@serwist/build'
import { build as viteBuild } from 'vite'
  
  const ROOT = process.cwd()
  
  const OUTPUT_CANDIDATES = [
    'dist/client',
    '.output/public',
    'dist/public',
    '.vercel/output/static',
    'build/client',
  ] as const
  
  async function main(): Promise<void> {
    const clientDirectory =
      await resolveClientDirectory()
  
    await copyPwaPublicAssets(
      clientDirectory,
    )
  
    const temporaryDirectory =
      path.resolve(
        ROOT,
        '.pwa-build',
      )
  
    const temporaryServiceWorker =
      path.resolve(
        temporaryDirectory,
        'sw.js',
      )
  
    const finalServiceWorker =
      path.resolve(
        clientDirectory,
        'sw.js',
      )
  
    await rm(
      temporaryDirectory,
      {
        recursive: true,
        force: true,
      },
    )
  
    await mkdir(
      temporaryDirectory,
      {
        recursive: true,
      },
    )
  
    const version =
      process.env
        .PWA_VERSION ??
      process.env
        .npm_package_version ??
      new Date()
        .toISOString()
        .replace(
          /[-:.TZ]/g,
          '',
        )
  
    await viteBuild({
      root: ROOT,
      configFile: false,
      publicDir: false,
      logLevel: 'warn',
  
      define: {
        __PWA_VERSION__:
          JSON.stringify(version),
        'process.env.NODE_ENV':
          JSON.stringify(
            'production',
          ),
      },
  
      build: {
        lib: {
          entry: path.resolve(
            ROOT,
            'src/platform/pwa/service-worker.ts',
          ),
  
          formats: ['es'],
  
          fileName: () => 'sw.js',
        },
  
        outDir:
          temporaryDirectory,
  
        emptyOutDir: false,
        minify: true,
        sourcemap: false,
  
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            entryFileNames: 'sw.js',
          },
        },
      },
    })
  
    const result =
      await injectManifest({
        swSrc:
          temporaryServiceWorker,
  
        swDest:
          finalServiceWorker,
  
        globDirectory:
          clientDirectory,
  
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webmanifest,woff,woff2}',
        ],
  
        globIgnores: [
          'sw.js',
          '**/*.map',
        ],
  
        injectionPoint:
          'self.__SW_MANIFEST',
  
        maximumFileSizeToCacheInBytes:
          5 * 1024 * 1024,
      })
  
    await rm(
      temporaryDirectory,
      {
        recursive: true,
        force: true,
      },
    )
  
    for (
      const warning
      of result.warnings
    ) {
      console.warn(
        `[PWA] ${warning}`,
      )
    }
  
    console.log(
      [
        '[PWA] Service Worker creado.',
        `Destino: ${path.relative(ROOT, finalServiceWorker)}`,
        `Recursos: ${result.count}`,
        `Tamaño: ${formatBytes(result.size)}`,
      ].join('\n'),
    )
  }
  
  async function resolveClientDirectory():
    Promise<string> {
    const configured =
      process.env
        .PWA_CLIENT_OUT_DIR
  
    if (configured) {
      const resolved =
        path.resolve(
          ROOT,
          configured,
        )
  
      if (
        await directoryExists(
          resolved,
        )
      ) {
        return resolved
      }
  
      throw new Error(
        [
          'PWA_CLIENT_OUT_DIR no existe.',
          `Ruta recibida: ${resolved}`,
          'Ejecuta primero el build principal.',
        ].join('\n'),
      )
    }
  
    for (
      const candidate
      of OUTPUT_CANDIDATES
    ) {
      const resolved =
        path.resolve(
          ROOT,
          candidate,
        )
  
      if (
        await directoryExists(
          resolved,
        )
      ) {
        return resolved
      }
    }
  
    throw new Error(
      [
        'No se encontró el directorio del build cliente.',
        'Ejecuta primero el build de TanStack Start.',
        'También puedes definir:',
        'PWA_CLIENT_OUT_DIR=dist/client',
        '',
        'Directorios revisados:',
        ...OUTPUT_CANDIDATES.map(
          (candidate) =>
            `- ${candidate}`,
        ),
      ].join('\n'),
    )
  }
  
  async function copyPwaPublicAssets(
    clientDirectory: string,
  ): Promise<void> {
    const publicDirectory =
      path.resolve(ROOT, 'public')
  
    if (
      !await directoryExists(
        publicDirectory,
      )
    ) {
      return
    }
  
    const assets = [
      'manifest.webmanifest',
      'offline.html',
      'pwa-icon.svg',
      'pwa-64x64.png',
      'pwa-192x192.png',
      'pwa-512x512.png',
      'maskable-icon-512x512.png',
      'apple-touch-icon.png',
    ]
  
    for (const asset of assets) {
      const source =
        path.resolve(
          publicDirectory,
          asset,
        )
  
      if (
        !await fileExists(source)
      ) {
        continue
      }
  
      const destination =
        path.resolve(
          clientDirectory,
          asset,
        )
  
      await mkdir(
        path.dirname(destination),
        {
          recursive: true,
        },
      )
  
      await cp(
        source,
        destination,
        {
          force: true,
        },
      )
    }
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
  
  function formatBytes(
    value: number,
  ): string {
    if (value < 1024) {
      return `${value} B`
    }
  
    if (
      value <
      1024 * 1024
    ) {
      return `${(
        value / 1024
      ).toFixed(1)} KB`
    }
  
    return `${(
      value /
      1024 /
      1024
    ).toFixed(2)} MB`
  }
  
  main().catch((error) => {
    console.error(
      '[PWA] Error al generar el Service Worker.',
    )
  
    console.error(error)
    process.exitCode = 1
  })
  