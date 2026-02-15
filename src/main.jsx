import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerLicense } from '@syncfusion/ej2-base';
import App from './App.jsx';
import '@syncfusion/ej2-base/styles/bootstrap-dark.css';
import '@syncfusion/ej2-buttons/styles/bootstrap-dark.css';
import '@syncfusion/ej2-splitbuttons/styles/bootstrap-dark.css';
import '@syncfusion/ej2-inputs/styles/bootstrap-dark.css';
import '@syncfusion/ej2-dropdowns/styles/bootstrap-dark.css';
import '@syncfusion/ej2-lists/styles/bootstrap-dark.css';
import '@syncfusion/ej2-popups/styles/bootstrap-dark.css';
import '@syncfusion/ej2-navigations/styles/bootstrap-dark.css';
import '@syncfusion/ej2-ribbon/styles/bootstrap-dark.css';
import './styles.css';

registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY || '');

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
