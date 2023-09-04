import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import requireTransform from 'vite-plugin-require-transform';

export default defineConfig({
	base: '/kuna/',
	plugins: [react(), tsconfigPaths(), requireTransform({})],
});
