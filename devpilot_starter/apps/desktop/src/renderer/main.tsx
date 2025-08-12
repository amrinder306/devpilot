import "./index.css";
import React from 'react'
import ReactDOM from 'react-dom/client'
import DevPilotLayout from './ui/DevPilotLayout'
import App from "./App";

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <DevPilotLayout />
    </React.StrictMode>
  )