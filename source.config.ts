import { defineDocs, defineConfig, frontmatterSchema } from 'fumadocs-mdx/config';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'docs',
  docs: {
    schema: frontmatterSchema.extend({
      icon: z.string().optional(),
      full: z.boolean().optional(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    // Remark/rehype plugins can be added here if needed
  },
});
