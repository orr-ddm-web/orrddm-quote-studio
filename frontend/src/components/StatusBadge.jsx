import React from 'react';

const STATUS_CONFIG = {
  draft: { label: 'טיוטה', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  sent: { label: 'נשלחה', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  pending: { label: 'ממתינת אישור', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  approved: { label: 'אושרה', color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'בוטלה', color: 'bg-red-100 text-red-700 border-red-200' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full border font-medium ${cfg.color} ${
        size === 'lg' ? 'text-sm' : 'text-xs'
      }`}
    >
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };
