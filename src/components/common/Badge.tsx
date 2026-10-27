import React from 'react';
import { EstadoServicio } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const variantStyles = {
    neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    danger: 'bg-red-950/60 text-red-400 border-red-800/80',
    info: 'bg-blue-950/60 text-blue-300 border-blue-800/80',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const EstadoServicioBadge: React.FC<{ estado: EstadoServicio }> = ({ estado }) => {
  switch (estado) {
    case 'finalizado':
      return <Badge variant="success">Finalizado</Badge>;
    case 'en_proceso':
      return <Badge variant="warning">En Proceso</Badge>;
    case 'pendiente':
      return <Badge variant="info">Pendiente</Badge>;
    case 'cancelado':
      return <Badge variant="danger">Cancelado</Badge>;
    default:
      return <Badge variant="neutral">{estado}</Badge>;
  }
};
