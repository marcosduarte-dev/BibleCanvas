import { build, type InlineConfig } from "vite"
import react from "@vitejs/plugin-react"
import fg from "fast-glob"
import path from "path"
import fs from "fs"
import tailwindcss from "@tailwindcss/vite"

const htmlName = "index.html"
const htmlRootName = "root"
const entryFileName = "src/main.tsx"
const outDir = "dist"

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const builtName = path.basename(path.dirname(entryFileName))

const entryAbs = path.resolve(entryFileName)

const createConfig = (): InlineConfig => ({
    plugins: [
        tailwindcss(),
        react(),
        {
            name: "remove-manual-chunks",
            outputOptions(options) {
                if ("manualChunks" in options) {
                    delete (options as any).manualChunks
                }
                return options
            },
        },
    ],
    esbuild: {
        jsx: "automatic",
        jsxImportSource: "react",
        target: "es2022",
    },
    build: {
        target: "es2022",
        outDir,
        emptyOutDir: false,
        chunkSizeWarningLimit: 2000,
        minify: "esbuild",
        cssCodeSplit: false,
        rollupOptions: {
            input: entryAbs,
            output: {
                format: "es",
                entryFileNames: `${builtName}.js`,
                inlineDynamicImports: true,
                assetFileNames: (info) => {
                    const name = info.names[0]
                    const modified = (name || "").endsWith(".css")
                        ? `${name}`
                        : `[name]-[hash][extname]`
                    return modified
                }
            },
            preserveEntrySignatures: "allow-extension",
            treeshake: true,
        },
    },
})

console.log(`Building ${builtName} (react)`)

await build(createConfig())

console.log(`Built ${builtName}`)

const htmlPath = path.join(outDir, htmlName)

// Collect output CSS and JS files as external references (NOT inlined)
// Inlining minified JS into HTML breaks regex patterns due to HTML parser interference
const cssPaths = fg.sync(`${outDir}/*.css`)
const jsPaths = fg.sync(`${outDir}/*.js`)

let cssLinks = ""
for (const cssPath of cssPaths) {
    const fileName = path.basename(cssPath)
    cssLinks += `  <link rel="stylesheet" href="./${fileName}">\n`
}

let jsScripts = ""
for (const jsPath of jsPaths) {
    const fileName = path.basename(jsPath)
    jsScripts += `  <script type="module" src="./${fileName}"></script>\n`
}

const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    "  <title>Bible Canvas</title>",
    cssLinks,
    "</head>",
    "<body>",
    `  <div id="${htmlRootName}"></div>`,
    jsScripts,
    "</body>",
    "</html>",
].join("\n")

fs.writeFileSync(htmlPath, html, { encoding: "utf8" })

console.log(`${htmlPath} (generated)`)
