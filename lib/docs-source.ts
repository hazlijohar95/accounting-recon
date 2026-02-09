import { docs } from '../.source/server';
import { loader } from 'fumadocs-core/source';
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
import { createElement } from 'react';

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

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  icon(icon) {
    if (!icon) return undefined;
    const Icon = iconMap[icon];
    if (Icon) return createElement(Icon);
    return undefined;
  },
});
