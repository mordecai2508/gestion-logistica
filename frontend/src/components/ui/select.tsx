import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  onValueChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, onValueChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onValueChange?.(e.target.value);
      onChange?.(e);
    };
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        onChange={handleChange}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  return (
    <div
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function SelectContent({ className, children, ...props }: SelectContentProps) {
  return (
    <div
      className={cn('relative z-50 min-w-[8rem] rounded-md border bg-popover shadow-md', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  className?: string;
}

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <option
      className={cn('relative flex cursor-pointer select-none items-center py-1.5 px-3 text-sm', className)}
      {...props}
    >
      {children}
    </option>
  );
}

export interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  return <span className="text-muted-foreground">{placeholder}</span>;
}
