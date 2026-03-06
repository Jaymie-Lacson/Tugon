import React from 'react';
import { Navigate } from 'react-router';

export function RedirectToApp() {
  return <Navigate to="/app" replace />;
}
