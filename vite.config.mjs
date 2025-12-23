import { execSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import requireTransform from 'vite-plugin-require-transform';
import tsconfigPaths from 'vite-tsconfig-paths';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const commitDate = execSync('git show -s --format=%ct HEAD').toString().trim();

export default defineConfig({
	define: {
		__COMMIT_HASH__: JSON.stringify(commitHash),
		__COMMIT_DATE__: JSON.stringify(commitDate),
	},
	base: '/kuna/',
	plugins: [tailwindcss(), react(), tsconfigPaths(), requireTransform({})],
});
