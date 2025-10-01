
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="text-center py-4 text-slate-500 text-sm">
      <p>Powered by AI & Love for Pets. &copy; {new Date().getFullYear()} Pet Home.</p>
    </footer>
  );
};

export default Footer;
