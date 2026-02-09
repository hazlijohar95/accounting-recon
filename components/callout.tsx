import { CircleCheck, CircleX, Info, Lightbulb, TriangleAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type CalloutType = 'info' | 'warn' | 'error' | 'success' | 'warning' | 'idea';

export function Callout({
  children,
  title,
  ...props
}: { title?: ReactNode } & Omit<CalloutContainerProps, 'title'>) {
  return (
    <CalloutContainer {...props}>
      {title && <CalloutTitle>{title}</CalloutTitle>}
      <CalloutDescription>{children}</CalloutDescription>
    </CalloutContainer>
  );
}

export interface CalloutContainerProps extends ComponentProps<'div'> {
  /**
   * @defaultValue info
   */
  type?: CalloutType;

  /**
   * Force an icon
   */
  icon?: ReactNode;
}

function resolveAlias(type: CalloutType) {
  if (type === 'warn') return 'warning';
  if ((type as unknown) === 'tip') return 'info';
  return type;
}

// Better Auth style - subtle left border accent
const typeStyles: Record<string, { border: string; icon: string; bg: string }> = {
  info: {
    border: 'border-l-blue-500',
    icon: 'text-blue-500',
    bg: 'bg-blue-500/5',
  },
  warning: {
    border: 'border-l-amber-500',
    icon: 'text-amber-500',
    bg: 'bg-amber-500/5',
  },
  error: {
    border: 'border-l-red-500',
    icon: 'text-red-500',
    bg: 'bg-red-500/5',
  },
  success: {
    border: 'border-l-emerald-500',
    icon: 'text-emerald-500',
    bg: 'bg-emerald-500/5',
  },
  idea: {
    border: 'border-l-purple-500',
    icon: 'text-purple-500',
    bg: 'bg-purple-500/5',
  },
};

const iconComponents: Record<string, typeof Info> = {
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
  success: CircleCheck,
  idea: Lightbulb,
};

export function CalloutContainer({
  type: inputType = 'info',
  icon,
  children,
  className,
  ...props
}: CalloutContainerProps) {
  const type = resolveAlias(inputType);
  const styles = typeStyles[type] || typeStyles.info;
  const IconComponent = iconComponents[type] || Info;

  return (
    <div
      className={cn(
        // Better Auth style - clean with subtle left border
        'flex gap-3 my-4 py-3 px-4 text-sm',
        'border-l-2 rounded-r-md',
        styles.border,
        styles.bg,
        className,
      )}
      {...props}
    >
      {icon ?? <IconComponent className={cn('size-4 mt-0.5 shrink-0', styles.icon)} />}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function CalloutTitle({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('font-medium text-foreground my-0!', className)} {...props}>
      {children}
    </p>
  );
}

export function CalloutDescription({ children, className, ...props }: ComponentProps<'p'>) {
  return (
    <div
      className={cn('text-muted-foreground prose-no-margin [&>p]:my-0', className)}
      {...props}
    >
      {children}
    </div>
  );
}
