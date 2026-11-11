import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const post = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/post' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date(),
    lastmod: z.coerce.date().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    slug: z.string().optional(),
    draft: z.boolean().default(false),
    author: z.string().optional(),
    keywords: z.array(z.string()).default([]),
  }),
});

const page = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/page' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    links: z.array(z.object({
      title: z.string(), description: z.string(), website: z.string(), image: z.string(),
    })).optional(),
    comments: z.boolean().optional(),
  }).loose(),
});

export const collections = { post, page };
