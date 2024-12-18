import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';

export default defineConfig({
    plugins: [
        tailwindcss({
            config: './tailwind.config.ts',
        }),
    ],
});
