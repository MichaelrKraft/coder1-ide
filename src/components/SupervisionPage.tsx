import React from 'react';
import { SupervisionDashboard } from './SupervisionDashboard';
import './SupervisionPage.css';

interface SupervisionPageProps {}

export const SupervisionPage: React.FC<SupervisionPageProps> = () => {
  return (
    <div className="supervision-page">
      <div className="supervision-page-content">
        <SupervisionDashboard 
          isVisible={true}
          onClose={null}
        />
      </div>
    </div>
  );
};

export default SupervisionPage;
