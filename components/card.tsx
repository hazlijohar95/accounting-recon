import Link from 'fumadocs-core/link';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Cards(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'grid gap-4 not-prose',
        // Default 2 columns, responsive
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;

  href?: string;
  external?: boolean;
};

export function Card({ icon, title, description, ...props }: CardProps) {
  const E = props.href ? Link : 'div';

  return (
    <E
      {...props}
      data-card
      className={cn(
        // Better Auth style - simple bordered cards
        'group relative flex flex-col gap-2 p-4',
        'border border-border rounded-lg',
        'bg-card text-card-foreground',
        'transition-all duration-200',
        props.href && [
          'hover:border-foreground/20',
          'hover:shadow-sm',
        ],
        props.className,
      )}
    >
      <h3 className="font-medium text-sm text-foreground">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {props.children && (
        <div className="text-sm text-muted-foreground leading-relaxed">
          {props.children}
        </div>
      )}
    </E>
  );
}
