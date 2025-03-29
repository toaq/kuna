import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import requireTransform from 'vite-plugin-require-transform';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	base: '/kuna/',
	plugins: [tailwindcss(), react(), tsconfigPaths(), requireTransform({})],
});
