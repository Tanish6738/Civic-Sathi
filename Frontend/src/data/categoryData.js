// Central category + subcategory data for ProgressiveForm
// Each category: { id, label, subcategories: [{ label, href }] }
export const categoryData = [
  {
    id: 'citizen-services',
    label: 'Citizen Services',
    subcategories: [
      { label: 'Citizen Charter Timeline', href: 'https://example.com/citizen-charter' },
      { label: 'Grievances', href: 'https://example.com/grievances' },
      { label: 'Birth Certificate', href: 'https://example.com/birth-cert' },
      { label: 'Death Certificate', href: 'https://example.com/death-cert' },
      { label: 'Marriage Certificate', href: 'https://example.com/marriage-cert' },
      { label: 'CRM Services', href: 'https://example.com/crm-services' }
    ]
  },
  {
    id: 'payments-taxes',
    label: 'Payments & Taxes',
    subcategories: [
      { label: 'Property Tax', href: 'https://example.com/property-tax' },
      { label: 'Water Charges', href: 'https://example.com/water-charges' },
      { label: 'Bill Tracking', href: 'https://example.com/bill-tracking' },
      { label: 'Others', href: 'https://example.com/others' }
    ]
  },
  {
    id: 'licenses-approvals',
    label: 'Licenses & Approvals',
    subcategories: [
      { label: 'Restaurant Licenses', href: 'https://example.com/restaurant-licenses' },
      { label: 'Tree Cutting Approvals', href: 'https://example.com/tree-cutting' }
    ]
  }
];

export default categoryData;
