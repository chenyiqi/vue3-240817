import path from 'path';
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import pico from 'picocolors'

if (!process.env.TARGET) {
    throw new Error('TARGET package must be specified via --environment flag.')
}
const require = createRequire(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

const masterVersion = require('./package.json').version
const packagesDir = path.resolve(__dirname, 'packages')
// 目标文件夹路径
const packageDir = path.resolve(packagesDir, process.env.TARGET)
// 通用方法，用于解析目标文件夹下的文件路径
const resolve = p => path.resolve(packageDir, p)
// 目标文件夹下的package.json文件路径
const pkg = require(resolve(`package.json`))
const packageOptions = pkg.buildOptions || {}
// 目标文件夹下的文件名
const name = packageOptions.filename || path.basename(packageDir)

const outputConfigs = {
    'esm-bundler': {
      file: resolve(`dist/${name}.esm-bundler.js`),
      format: `es`
    },
    'esm-browser': {
      file: resolve(`dist/${name}.esm-browser.js`),
      format: `es`
    },
    cjs: {
      file: resolve(`dist/${name}.cjs.js`),
      format: `cjs`
    },
    global: {
      file: resolve(`dist/${name}.global.js`),
      format: `iife`
    },
    // runtime-only builds, for main "vue" package only
    'esm-bundler-runtime': {
      file: resolve(`dist/${name}.runtime.esm-bundler.js`),
      format: `es`
    },
    'esm-browser-runtime': {
      file: resolve(`dist/${name}.runtime.esm-browser.js`),
      format: 'es'
    },
    'global-runtime': {
      file: resolve(`dist/${name}.runtime.global.js`),
      format: 'iife'
    }
}

const defaultFormats = ['esm-bundler', 'cjs']
const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(',')
const packageFormats = inlineFormats || packageOptions.formats || defaultFormats
const packageConfigs = process.env.PROD_ONLY
  ? []
  : packageFormats.map(format => createConfig(format, outputConfigs[format]))


export default packageConfigs


function createConfig(format, output, plugins = []) {
    if (!output) {
        console.log(pico.yellow(`invalid format: "${format}"`))
        process.exit(1)
    }

    const isProductionBuild =
    process.env.__DEV__ === 'false' || /\.prod\.js$/.test(output.file)
    const isBundlerESMBuild = /esm-bundler/.test(format)
    const isBrowserESMBuild = /esm-browser/.test(format)
    const isServerRenderer = name === 'server-renderer'
    const isNodeBuild = format === 'cjs'
    const isGlobalBuild = /global/.test(format)
    const isCompatPackage =
        pkg.name === '@vue/compat' || pkg.name === '@vue/compat-canary'
    const isCompatBuild = !!packageOptions.compat
    const isBrowserBuild =
        (isGlobalBuild || isBrowserESMBuild || isBundlerESMBuild) &&
        !packageOptions.enableNonBrowserBranches
    
    output.exports = isCompatPackage ? 'auto' : 'named'

    let entryFile = /runtime$/.test(format) ? `src/runtime.ts` : `src/index.ts`


    function resolveExternal() {
        const treeShakenDeps = ['source-map-js', '@babel/parser', 'estree-walker']
    
        if (isGlobalBuild || isBrowserESMBuild || isCompatPackage) {
          if (!packageOptions.enableNonBrowserBranches) {
            // normal browser builds - non-browser only imports are tree-shaken,
            // they are only listed here to suppress warnings.
            return treeShakenDeps
          }
        } else {
          // Node / esm-bundler builds.
          // externalize all direct deps unless it's the compat build.
          return [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.peerDependencies || {}),
            // for @vue/compiler-sfc / server-renderer
            ...['path', 'url', 'stream'],
            // somehow these throw warnings for runtime-* package builds
            ...treeShakenDeps
          ]
        }
    }
    return {
        input: resolve(entryFile),
        external: resolveExternal(),
        output,
    }
}
