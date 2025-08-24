import React from 'react';
import { Phone, Mail, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

// Helper function to generate a gradient based on name
const getNameGradient = (name) => {
  let hash = 0;
  if (name.length === 0) return 'from-purple-600 to-purple-400';
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    'from-purple-600 to-indigo-400',
    'from-indigo-500 to-purple-500',
    'from-purple-500 to-pink-400',
    'from-violet-600 to-purple-400',
    'from-purple-700 to-purple-400',
    'from-fuchsia-600 to-purple-600',
    'from-purple-600 to-blue-500',
  ];
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

const OfficerContacts = ({ officers = [] }) => {
  if (!officers.length) return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl border-2 border-purple-800 shadow-lg">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg"
        >
          <Shield size={28} className="text-white" />
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-base font-bold text-white mb-1">No Officer Contacts Found</h3>
          <p className="text-sm text-white/70">
            Officer contacts will appear here once assigned to your report
          </p>
        </motion.div>
      </div>
    </div>
  );
  
  return (
    <ul className="divide-y divide-purple-800 rounded-xl border-2 border-purple-800 shadow-lg overflow-hidden">
      {officers.map((o, index) => (
        <motion.li 
          key={o.id} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -2 }}
          className="p-5 flex flex-col gap-3 relative overflow-hidden rounded-lg mb-2 shadow-lg"
        >
          {/* Gradient top bar based on officer name */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${getNameGradient(o.name)}`}></div>
          
          <div className="flex items-center">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${getNameGradient(o.name)} flex items-center justify-center shadow-lg`}>
              <Shield size={18} className="text-white" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="font-bold text-sm text-white flex items-center">
                <span className="bg-gradient-to-r from-purple-400 to-indigo-300 text-transparent bg-clip-text">{o.name}</span>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                  className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-900 text-white"
                >
                  Officer
                </motion.div>
              </h3>
              <p className="text-[11px] text-white/70 mt-0.5">
                Available to assist with your report
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-1">
            {o.phone && (
              <motion.a 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                href={`tel:${o.phone}`} 
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-900 to-purple-800 text-white rounded-lg hover:shadow-md transition-all border border-purple-800"
              >
                <div className="h-6 w-6 rounded-full bg-purple-800 flex items-center justify-center">
                  <Phone size={14} className="text-white" />
                </div>
                <span className="font-medium">{o.phone}</span>
              </motion.a>
            )}
            
            {o.email && (
              <motion.a 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                href={`mailto:${o.email}`} 
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-900 to-purple-800 text-white rounded-lg hover:shadow-md transition-all border border-purple-800"
              >
                <div className="h-6 w-6 rounded-full bg-purple-800 flex items-center justify-center">
                  <Mail size={14} className="text-white" />
                </div>
                <span className="font-medium">{o.email}</span>
              </motion.a>
            )}
          </div>
          
          {/* Subtle decorative element */}
          <div className="absolute bottom-0 right-0 opacity-10">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2"/>
              <path d="M12 8V16" stroke="white" strokeWidth="2"/>
              <path d="M8 12H16" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
        </motion.li>
      ))}
    </ul>
  );
};

export default OfficerContacts;
