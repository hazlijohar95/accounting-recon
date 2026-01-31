import { Config } from '@remotion/cli/config'
import path from 'path'

/**
 * Remotion configuration.
 * See: https://www.remotion.dev/docs/config
 */

// Set the entry point for the Remotion bundle
Config.setEntryPoint('./remotion/index.ts')

// Enable webpack caching for faster rebuilds
Config.setCachingEnabled(true)

// Video encoding settings for production
Config.setCodec('h264')
Config.setPixelFormat('yuv420p')

// Use angle for WebGL rendering (required for Three.js in headless mode)
Config.setChromiumOpenGlRenderer('angle')

// Configure webpack aliases to match Next.js path aliases
Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@': path.resolve(__dirname, '.'),
      },
    },
  }
})
