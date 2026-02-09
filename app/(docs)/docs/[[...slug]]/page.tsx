import { source } from '@/lib/docs-source';
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from 'fumadocs-ui/page';
import { notFound, redirect } from 'next/navigation';
import { getMDXComponents } from '@/lib/mdx-components';
import type { Metadata } from 'next';
import type { MDXContent } from 'mdx/types';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  // Redirect root /docs to /docs/introduction
  if (!slug || slug.length === 0) {
    redirect('/docs/introduction');
  }

  const page = source.getPage(slug);
  if (!page) notFound();

  // Cast to access the body property from fumadocs-mdx
  const pageData = page.data as unknown as {
    body: MDXContent;
    toc: Array<{ title: string; url: string; depth: number }>;
    title?: string;
    description?: string;
    full?: boolean;
  };

  const MDX = pageData.body;

  return (
    <DocsPage
      toc={pageData.toc}
      full={pageData.full}
      tableOfContent={{
        style: 'clerk',
        single: false,
      }}
      tableOfContentPopover={{
        style: 'clerk',
      }}
    >
      <DocsTitle>{pageData.title}</DocsTitle>
      <DocsDescription>{pageData.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Handle root /docs case
  if (!slug || slug.length === 0) {
    return {
      title: 'Documentation | Reconciled',
      description: 'Documentation for Reconciled - Automated accounting reconciliation platform',
    };
  }

  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: `${page.data.title ?? 'Documentation'} | Reconciled Docs`,
    description: page.data.description ?? 'Reconciled documentation',
  };
}
