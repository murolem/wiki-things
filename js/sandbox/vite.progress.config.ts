import { defineConfig } from 'vite';
import dts from 'unplugin-dts/vite'
import fs from 'fs';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const outputFilename = "index.js";

export default defineConfig(({ command, mode }) => ({
    build: {
        target: 'es6',
        lib: {
            entry: "./src/progress/index.ts",
            fileName: outputFilename.split(".")[0],
            name: "wawa",
            formats: ["es"]
        },
        minify: false,
    },
    plugins: [
        ...(command === 'build' ? [cssInjectedByJsPlugin()] : []),
        // dts(),
        {
            name: 'my-plugin-for-index-html-build-replacement',
            transformIndexHtml: {
                enforce: 'pre', // Tells Vite to run this before other processes
                handler() {
                    // Grab new HTML content to place into index.html
                    return fs.readFileSync('./index.progress.html', 'utf8')
                }
            }
        },
        {
            // a simple plugin for appending text to the resulting.
            // in this case, it makes the resulting code to be able to run 
            // in a bookmarklet (only to have the ability to start, without changing the code) 
            // in a self-contained IIFE mode.
            name: 'vite-plugin-append-text',
            // ensures that the wrapped code remains wrapped and not interrupted
            // by other plugins.
            enforce: 'post',
            generateBundle(options, bundle) {
                const output = bundle[outputFilename];
                if (!output)
                    throw new Error(`'${outputFilename}' output file not found by 'vite-plugin-append-text'`);
                else if (output.type !== 'chunk')
                    throw new Error(`'${output.type}' output type is not supported by 'vite-plugin-append-text'`);

                // const prepend = "mw.hook( 'wikipage.content' ).add( () => {\n";
                // const append = "\n})";
                const prepend = `\
// :dune_stare:
// Author: aliser
// Source code: github.com/murolem/wiki-things/blob/main/js/sandbox/src/progress/index.ts

(() => {\n`;
                const append = "\n})();";

                output.code = 
                    prepend 
                    + output.code.split("\n").map(l => "    " + l).join('\n')
                    + append;
            }
        },
    ],
}));