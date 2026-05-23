import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function MedicalBadge({ isMedicalProfessional, className = "w-4 h-4 ml-1 text-blue-600" }) {
  if (!isMedicalProfessional) return null;
  return (
    <span title="Verified Medical Professional" className="inline-flex items-center">
      <ShieldCheck className={className} />
    </span>
  );
}
