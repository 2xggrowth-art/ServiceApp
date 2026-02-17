import type { ReactNode, MouseEvent } from 'react';

interface CardProps {
  children: ReactNode;
  bordered?: boolean;
  borderColor?: string;
  className?: string;
  elevated?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

export default function Card({ children, bordered, borderColor, className = '', elevated, onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-4
        ${elevated ? 'shadow-elevated' : 'shadow-card'} hover:shadow-card-hover transition-shadow duration-200
        ${bordered ? `border-l-4 ${borderColor || 'border-blue-primary'}` : ''}
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-all duration-150' : ''}
        ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
