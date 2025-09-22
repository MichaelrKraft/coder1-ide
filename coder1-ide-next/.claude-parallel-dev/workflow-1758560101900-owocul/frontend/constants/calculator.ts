import { ButtonConfig } from '../types/calculator';

export const BUTTON_CONFIGS: ButtonConfig[] = [
  { label: 'C', value: 'clear', type: 'clear', className: 'clear' },
  { label: '±', value: 'toggle-sign', type: 'operation', className: 'operation' },
  { label: '%', value: '%', type: 'operation', className: 'operation' },
  { label: '÷', value: '/', type: 'operation', className: 'operation' },
  
  { label: '7', value: '7', type: 'number' },
  { label: '8', value: '8', type: 'number' },
  { label: '9', value: '9', type: 'number' },
  { label: '×', value: '*', type: 'operation', className: 'operation' },
  
  { label: '4', value: '4', type: 'number' },
  { label: '5', value: '5', type: 'number' },
  { label: '6', value: '6', type: 'number' },
  { label: '−', value: '-', type: 'operation', className: 'operation' },
  
  { label: '1', value: '1', type: 'number' },
  { label: '2', value: '2', type: 'number' },
  { label: '3', value: '3', type: 'number' },
  { label: '+', value: '+', type: 'operation', className: 'operation' },
  
  { label: '0', value: '0', type: 'number', className: 'zero' },
  { label: '.', value: '.', type: 'decimal' },
  { label: '=', value: '=', type: 'equals', className: 'equals' },
];

export const MAX_DISPLAY_LENGTH = 12;