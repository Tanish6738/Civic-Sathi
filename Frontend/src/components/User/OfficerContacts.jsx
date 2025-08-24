import React from 'react';

const OfficerContacts = ({ officers = [] }) => {
  if (!officers.length) return <div className="text-xs text-gray-500">No officer contacts found.</div>;
  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white/70">
      {officers.map(o => (
        <li key={o.id} className="p-3 text-xs flex flex-col gap-1">
          <span className="font-medium text-gray-800">{o.name}</span>
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
            {o.phone && <a href={`tel:${o.phone}`} className="text-indigo-600 hover:underline">📞 {o.phone}</a>}
            {o.email && <a href={`mailto:${o.email}`} className="text-indigo-600 hover:underline">✉️ {o.email}</a>}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default OfficerContacts;
