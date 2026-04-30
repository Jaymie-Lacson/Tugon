import React from 'react';
import { useNavigate } from 'react-router';
import { getAuthSession } from '../utils/authSession';
import { resolveDefaultAppPath } from '../utils/navigationGuards';

interface RoleHomeLogoProps {
  to?: string;
  ariaLabel?: string;
  alt?: string;
  height?: number;
}

export function RoleHomeLogo({
  to,
  ariaLabel = 'Go to role home',
  alt = 'TUGON Tondo Emergency Response',
  height = 38,
}: RoleHomeLogoProps) {
  const navigate = useNavigate();
  const targetPath = to ?? resolveDefaultAppPath(getAuthSession());

  return (
    <button
      type="button"
      onClick={() => navigate(targetPath)}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      aria-label={ariaLabel}
    >
      <img
        src="/tugon-header-logo.svg"
        alt={alt}
        style={{ height, width: 'auto', display: 'block' }}
      />
    </button>
  );
}

export default RoleHomeLogo;