import { ReactNode } from 'react';
import { Stock, Option, WheelEvent, ApiError } from './index';

// Common Component Props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

// Error Boundary Props
export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

// Form Props
export interface BaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  disabled?: boolean;
}

export interface StockFormProps extends BaseFormProps {
  stock?: Stock | null;
  onSubmit: (data: any) => Promise<void>;
}

export interface OptionFormProps extends BaseFormProps {
  option?: Option | null;
  onSubmit: (data: any) => Promise<void>;
}

export interface WheelEventFormProps extends BaseFormProps {
  wheelCycleId?: number;
  event?: WheelEvent | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

// Table Props
export interface TableColumn<T = any> {
  key: string;
  title: string;
  render?: (value: any, record: T) => ReactNode;
  sortable?: boolean;
  width?: string | number;
}

export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onRowClick?: (record: T) => void;
  rowKey?: string | ((record: T) => string);
}

// Page Props
export interface StockPageProps {
  // Add specific props if needed
}

export interface OptionPageProps {
  // Add specific props if needed
}

export interface WheelPageProps {
  selectedTicker?: string;
  onTickerChange?: (ticker: string) => void;
}

// Timeline Component Props
export interface TimelineProps {
  events: WheelEvent[];
  loading?: boolean;
  onEventClick?: (event: WheelEvent) => void;
}

// Button Props
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

// Badge Props
export interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error';
}

// Input Props
export interface InputProps {
  type?: 'text' | 'number' | 'email' | 'password' | 'date';
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  error?: string;
}

// Select Props
export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

// Modal Props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
}

// Loading Props
export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

// Error Display Props
export interface ErrorDisplayProps extends BaseComponentProps {
  error: ApiError | Error | string;
  onRetry?: () => void;
  showRetry?: boolean;
}

// Navigation Props
export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: ReactNode;
}

export interface NavigationProps extends BaseComponentProps {
  items: NavigationItem[];
  activeItem?: string;
  onItemClick?: (item: NavigationItem) => void;
}
