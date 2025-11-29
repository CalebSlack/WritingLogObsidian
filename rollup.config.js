import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const isProd = (process.env.BUILD === 'production');

export default {
  input: 'main.ts',
  output: {
    dir: 'dist',
    sourcemap: isProd,
    format: 'cjs'
  },
  external: ['obsidian'],
  plugins: [
    typescript({ declaration: true }),
    nodeResolve({ browser: true }),
    commonjs()
  ]
};