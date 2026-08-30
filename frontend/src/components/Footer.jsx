import React from 'react';

const Footer = () => {
  return (
    <footer className="main-footer">
      <div className="container" style={{ textAlign: 'center', fontSize: '0.88rem' }}>
        <p>&copy; {new Date().getFullYear()} YumPlan. Built with React, Node.js, Express, and PostgreSQL.</p>
      </div>
    </footer>
  );
};

export default Footer;
