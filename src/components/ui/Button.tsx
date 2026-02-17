import type { ReactNode, ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-blue-primary text-white hover:bg-blue-700 active:bg-blue-800',
  success: 'bg-green-success text-white hover:bg-green-700 active:bg-green-800',
  danger: 'bg-red-urgent text-white hover:bg-red-700 active:bg-red-800',
  warning: 'bg-orange-action text-white hover:bg-orange-700 active:bg-orange-800',
  outline: 'border border-grey-border text-grey-text bg-white hover:bg-grey-bg active:bg-grey-border',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-5 py-4 text-base rounded-xl',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  block?: boolean;
}

export default function Button({
  children, variant = 'primary', size = 'md', block = false,
  disabled = false, className = '', onClick, ...props
}: ButtonProps) {
  return (
    <button
      className={`font-semibold transition-all duration-150 cursor-pointer
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${block ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
