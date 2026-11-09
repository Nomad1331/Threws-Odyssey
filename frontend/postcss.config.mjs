/**
 * PostCSS pipeline for the frontend.
 *
 * Tailwind is the only transform: it expands the utility classes used in
 * `src/`, and `tailwind.config.ts` maps those utilities onto the CSS variables
 * declared in `src/app/globals.css`. No autoprefixer plugin is listed because
 * Next.js already applies its default browser prefixing.
 *
 * @type {import('postcss-load-config').Config}
 */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;
