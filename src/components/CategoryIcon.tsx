import React, { useState } from 'react';
import { CategoryDef } from '../constants';

interface Props {
  cat: CategoryDef;
  imgClassName?: string;
}

export function CategoryIcon({ cat, imgClassName = 'w-6 h-6' }: Props) {
  const [error, setError] = useState(false);

  if (cat.logoUrl && !error) {
    return (
      <img
        src={cat.logoUrl}
        alt={cat.label}
        onError={() => setError(true)}
        className={`object-contain ${imgClassName}`}
      />
    );
  }
  return <span className="leading-none">{cat.icon}</span>;
}
