// Type declarations for UI components
declare module '@/components/ui/button' {
  import { ButtonHTMLAttributes, ReactNode } from 'react';

  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    children?: ReactNode;
  }

  export const Button: React.FC<ButtonProps>;
}

declare module './ui/button' {
  export * from '@/components/ui/button';
}

// For ErrorBoundary's relative import
declare module 'src/components/ui/button' {
  export * from '@/components/ui/button';
}

declare module '@/lib/utils' {
  export function formatCurrency(amount: number): string;
  export function cn(...classes: (string | undefined | null | boolean)[]): string;
}

declare module '../components/forms/StockForm' {
  import { Stock } from '@/types';

  export interface StockFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    stock?: Stock | null;
    disabled?: boolean;
  }

  const StockForm: React.FC<StockFormProps>;
  export default StockForm;
}

declare module '@/components/forms/StockForm' {
  import { Stock } from '@/types';

  export interface StockFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    stock?: Stock | null;
    disabled?: boolean;
  }

  const StockForm: React.FC<StockFormProps>;
  export default StockForm;
}

declare module '@/components/tables/StockTable' {
  import { Stock } from '@/types';

  export interface StockTableProps {
    stocks: Stock[];
    onEdit: (stock: Stock) => void;
    onDelete: (stockId: number) => void;
    disabled?: boolean;
  }

  const StockTable: React.FC<StockTableProps>;
  export default StockTable;
}
