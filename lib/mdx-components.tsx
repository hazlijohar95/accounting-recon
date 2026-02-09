import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';
import { Card, Cards } from '@/components/card';
import { Callout } from '@/components/callout';
import { Tabs as BaseTabs, Tab as BaseTab, TabsList, TabsTrigger, TabsContent } from '@/components/tabs';
import { Steps, Step } from '@/components/steps';
import { Accordions, Accordion } from '@/components/accordion';
import { ImageZoom } from '@/components/image-zoom';
import {
  Brain,
  BarChart2,
  FileInput,
  FileOutput,
  Rocket,
  Eye,
  Upload,
  FileText,
  Settings,
  Building2,
  Users,
  BarChart3,
  Download,
  Sparkles,
  HelpCircle,
  BookOpen,
  Wand2,
  Calculator,
  CheckCircle,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { Children, type ReactElement, type ReactNode, isValidElement } from 'react';

// Map icon strings to Lucide components
const iconMap: Record<string, LucideIcon> = {
  brain: Brain,
  'chart-simple': BarChart2,
  'file-import': FileInput,
  'file-export': FileOutput,
  rocket: Rocket,
  eye: Eye,
  upload: Upload,
  'file-text': FileText,
  settings: Settings,
  building2: Building2,
  users: Users,
  'bar-chart-3': BarChart3,
  download: Download,
  sparkles: Sparkles,
  'help-circle': HelpCircle,
  'book-open': BookOpen,
  wand2: Wand2,
  calculator: Calculator,
  'check-circle': CheckCircle,
  search: Search,
};

// Helper to resolve icon
function resolveIcon(icon?: string): ReactNode | undefined {
  if (!icon) return undefined;
  const Icon = iconMap[icon];
  if (Icon) return <Icon className="size-4" />;
  return undefined;
}

// Mintlify-compatible CardGroup component
function CardGroup({
  cols = 2,
  children,
}: {
  cols?: number;
  children: ReactNode;
}) {
  return (
    <Cards
      className={cols === 3 ? 'grid-cols-3' : cols === 1 ? 'grid-cols-1' : 'grid-cols-2'}
    >
      {children}
    </Cards>
  );
}

// Mintlify-compatible Card wrapper with icon string support
function MintlifyCard({
  title,
  icon,
  href,
  children,
}: {
  title: string;
  icon?: string;
  href?: string;
  children?: ReactNode;
}) {
  return (
    <Card title={title} icon={resolveIcon(icon)} href={href}>
      {children}
    </Card>
  );
}

// Mintlify-compatible Tabs wrapper that extracts titles from Tab children
function MintlifyTabs({ children }: { children: ReactNode }) {
  // Extract titles from Tab children
  const items: string[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && (child.props as { title?: string }).title) {
      items.push((child.props as { title: string }).title);
    }
  });

  return (
    <BaseTabs items={items}>
      {children}
    </BaseTabs>
  );
}

// Mintlify-compatible Tab wrapper that converts title to value
function MintlifyTab({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <BaseTab value={title}>
      {children}
    </BaseTab>
  );
}

// Mintlify callout aliases
function Tip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Callout type="info" title={title}>
      {children}
    </Callout>
  );
}

function Note({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Callout type="info" title={title}>
      {children}
    </Callout>
  );
}

function Warning({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Callout type="warning" title={title}>
      {children}
    </Callout>
  );
}

function Info({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Callout type="info" title={title}>
      {children}
    </Callout>
  );
}

function Check({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <Callout type="success" title={title}>
      {children}
    </Callout>
  );
}

export function getMDXComponents(): MDXComponents {
  return {
    ...defaultComponents,
    // Cards
    Card: MintlifyCard,
    Cards,
    CardGroup,
    // Callouts - Mintlify style
    Callout,
    Tip,
    Note,
    Warning,
    Info,
    Check,
    // Tabs - Mintlify style
    Tabs: MintlifyTabs,
    Tab: MintlifyTab,
    TabsList,
    TabsTrigger,
    TabsContent,
    // Steps
    Steps,
    Step,
    // Accordion
    Accordions,
    AccordionGroup: Accordions, // Mintlify alias
    Accordion,
    // Images
    img: ImageZoom,
    Image: ImageZoom,
  };
}
