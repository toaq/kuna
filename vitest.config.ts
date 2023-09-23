import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		setupFiles: ['src/set-up-tests.ts'],
	},
});
