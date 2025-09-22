import React from 'react';
import styles from './Display.module.css';

interface DisplayProps {
  value: string;
  className?: string;
}

export const Display: React.FC<DisplayProps> = ({ value, className }) => {
  return (
    <div className={`${styles.display} ${className || ''}`}>
      <span className={styles.value}>{value}</span>
    </div>
  );
};

export default Display;