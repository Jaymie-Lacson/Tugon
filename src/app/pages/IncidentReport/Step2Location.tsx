import React, { Suspense, useState, useEffect } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { useTheme } from 'next-themes';
import { citizenReportsApi } from '../../services/citizenReportsApi';
import { getAuthSession } from '../../utils/authSession';
import {
  TILE_URLS,
  TILE_ATTRIBUTIONS,
  BARANGAY_BOUNDARIES,
  BARANGAY_BOUNDARY_BOUNDS,
  isPinWithinSupportedBarangay,
  getBarangayBoundaryCenter,
  findBarangayByCode,
  TONDO_MAP_CENTER,
} from './shared';
import type { ReportForm } from './types';

const LazyIncidentMap = React.lazy(() => import('./Map'));

export function Step2({
  form,
  setForm,
  validationError,
}: {
  form: ReportForm;
  setForm: React.Dispatch<React.SetStateAction<ReportForm>>;
  validationError?: string;
}) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tileUrl = isDark ? TILE_URLS.dark : TILE_URLS.light;
  const tileAttribution = isDark ? TILE_ATTRIBUTIONS.dark : TILE_ATTRIBUTIONS.light;
  const session = getAuthSession();
  const userBarangayCode = session?.user.barangayCode ?? null;
  const allowedBarangays = userBarangayCode
    ? BARANGAY_BOUNDARIES.filter((barangay) => barangay.code === userBarangayCode)
    : [];
  const [mapExpanded, setMapExpanded] = useState(false);
  const [pinValidationInFlight, setPinValidationInFlight] = useState(false);
  const [pinValidationError, setPinValidationError] = useState<string | null>(null);
  const hasBarangayProfile = allowedBarangays.length > 0;
  const pinInSupportedArea = isPinWithinSupportedBarangay(form.pin);
  const assignedBarangayCenter = hasBarangayProfile
    ? getBarangayBoundaryCenter(allowedBarangays[0].boundary)
    : TONDO_MAP_CENTER;

  useEffect(() => {
    if (!mapExpanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mapExpanded]);

  const placePin = async (lat: number, lng: number) => {
    if (!hasBarangayProfile) return;

    setPinValidationError(null);
    setPinValidationInFlight(true);

    try {
      const pinValidation = await citizenReportsApi.validateReportPin(lat, lng);
      const routedBarangay = findBarangayByCode(pinValidation.routedBarangayCode);
      const routedLabel = routedBarangay?.name ?? `Barangay ${pinValidation.routedBarangayCode}`;

      setForm((p) => ({
        ...p,
        pin: {
          lat,
          lng,
          barangay: routedLabel,
          district: routedBarangay?.district ?? 'Tondo, Manila',
          barangayCode: pinValidation.routedBarangayCode,
          isCrossBarangay: Boolean(pinValidation.isCrossBarangay),
        },
        address: p.address.trim() ? p.address : `${routedLabel}, ${routedBarangay?.district ?? 'Tondo, Manila'}`,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to validate pin location right now.';
      const isOutsideSupportedArea = message.toLowerCase().includes('outside supported barangay boundaries');

      setPinValidationError(isOutsideSupportedArea ? null : message);
      setForm((p) => ({
        ...p,
        pin: {
          lat,
          lng,
          barangay: isOutsideSupportedArea ? 'Outside Supported Area' : 'Unverified Pin',
          district: 'Tondo, Manila',
          barangayCode: null,
          isCrossBarangay: false,
        },
      }));
    } finally {
      setPinValidationInFlight(false);
    }
  };

  const renderMap = (height: number | string) => (
    <Suspense fallback={<div style={{ height }} className="incident-step2-map bg-muted animate-pulse" />}>
      <LazyIncidentMap
        height={height}
        tileUrl={tileUrl}
        tileAttribution={tileAttribution}
        allowedBarangays={allowedBarangays}
        pin={form.pin}
        onMapClick={placePin}
        pinLabel={t('citizen.report.step2.incidentPin')}
        boundaryBounds={BARANGAY_BOUNDARY_BOUNDS}
      />
    </Suspense>
  );

  return (
    <div className="pt-[22px] px-4 pb-2">
      <div className="mb-4">
        <div className="inline-flex items-center gap-1.5 bg-[#EFF6FF] rounded-lg px-3 py-1 text-primary text-[10px] font-bold tracking-[0.08em] uppercase mb-2.5">{t('citizen.report.step2.badge')}</div>
        <h2 className="text-[20px] font-extrabold text-foreground mb-1.5 leading-tight">
          {t('citizen.report.step2.heading')}
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {t('citizen.report.step2.desc')}
        </p>
      </div>

      <div
        className={[
          'incident-step2-map-shell relative overflow-hidden rounded-xl mb-3 border-2 transition-all duration-300',
          form.pin
            ? 'border-[#3B82F6] shadow-[0_8px_16px_rgba(15,23,42,0.14)]'
            : 'border-border shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => setMapExpanded(true)}
          className="absolute top-2.5 right-2.5 z-[11] border border-white/70 bg-[#0F172AB8] text-white rounded-[10px] py-1.5 px-2.5 text-[11px] font-bold"
        >
          {t('citizen.report.step2.expandMap')}
        </button>

        {!form.pin && (
          <div className="incident-step2-map-hint absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0F172AE0] text-white rounded-lg py-2 px-3.5 text-xs font-semibold pointer-events-none z-10 flex max-w-[calc(100%-20px)] items-center justify-center gap-[7px] text-center shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
            <MapPin size={13} /> {t('citizen.report.step2.tapHint')}
          </div>
        )}
        {renderMap(320)}
      </div>

      {mapExpanded ? (
        <div className="incident-step2-fullscreen fixed inset-0 z-[250] flex flex-col bg-[#0B1220]">
          <div className="flex items-center justify-between gap-3 px-[14px] py-3 text-white border-b border-white/[0.15]">
            <div className="text-[13px] font-bold">{t('citizen.report.step2.expandedMapTitle')}</div>
            <button
              type="button"
              onClick={() => setMapExpanded(false)}
              className="border border-white/25 bg-white/[0.08] text-white rounded-[10px] py-1.5 px-3 text-xs font-bold cursor-pointer"
            >
              {t('common.close')}
            </button>
          </div>
          <div className="flex-1">{renderMap('100%')}</div>
          <div className="px-[14px] py-2.5 text-[#BFDBFE] text-xs">
            {t('citizen.report.step2.expandedMapTip')}
          </div>
        </div>
      ) : null}

      {form.pin ? (
        <div className="incident-step2-pin-chip bg-[#EFF6FF] rounded-[10px] p-[12px_14px] border-[1.5px] border-[#93C5FD] mb-3 flex items-center gap-2.5 shadow-sm">
          <div className="w-9 h-9 rounded-[10px] bg-[#DBEAFE] flex items-center justify-center text-primary shrink-0">
            <MapPin size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[13px] text-foreground">{form.pin.barangay}</div>
            <div className="text-[11px] text-[#3B82F6] mt-px font-medium">
              {t('citizen.report.step2.pinCoords', { district: form.pin.district, lat: form.pin.lat.toFixed(6), lng: form.pin.lng.toFixed(6) })}
            </div>
          </div>
          <button
            onClick={() => setForm(p => ({ ...p, pin: null }))}
            aria-label="Remove selected incident pin"
            className="icon-btn-square icon-btn-sm incident-step2-pin-clear bg-black/5 text-muted-foreground rounded-lg inline-flex items-center justify-center shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => placePin(assignedBarangayCenter[0], assignedBarangayCenter[1])}
          disabled={!hasBarangayProfile}
          className={[
            'w-full mb-3 rounded-[13px] border-[1.5px] border-[#BFDBFE] bg-[#EFF6FF] text-primary font-bold text-[13px] flex items-center justify-center gap-2 p-[13px] transition-all duration-150',
            !hasBarangayProfile ? 'opacity-60' : 'opacity-100',
          ].join(' ')}
        >
          <Navigation size={15} /> {t('citizen.report.step2.useRegisteredLocation')}
        </button>
      )}

      {!hasBarangayProfile ? (
        <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {t('citizen.report.step2.noBarangayProfile')}
        </div>
      ) : null}

      {form.pin && hasBarangayProfile && !pinInSupportedArea ? (
        <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {t('citizen.report.step2.pinOutsideBoundary')}
        </div>
      ) : null}

      {pinValidationInFlight ? (
        <div className="mb-3 text-xs text-primary">
          {t('citizen.report.step2.validatingPin')}
        </div>
      ) : null}

      {pinValidationError ? (
        <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {pinValidationError}
        </div>
      ) : null}

      {form.pin && hasBarangayProfile && pinInSupportedArea && form.pin.isCrossBarangay ? (
        <div className="mb-3 rounded-[10px] border border-[var(--secondary-fixed-dim)] bg-[var(--severity-medium-bg)] text-[var(--severity-medium)] text-xs p-[9px_11px]">
          {t('citizen.report.step2.crossBarangayNotice', { barangay: form.pin.barangay })}
        </div>
      ) : null}

      <div>
        <label className="text-[11px] font-bold text-muted-foreground block mb-[7px] uppercase tracking-[0.07em]">
          {t('citizen.report.step2.addressLabel')}
        </label>
        <input
          value={form.address}
          onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          placeholder={t('citizen.report.step2.addressPlaceholder')}
          className="incident-step2-address-input"
        />
      </div>

      {validationError ? (
        <div className="mt-2.5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] text-severity-critical text-xs p-[9px_11px]">
          {validationError}
        </div>
      ) : null}

      <style>{`
        .incident-step2-fullscreen {
          top: var(--app-vv-top, 0px);
          bottom: var(--app-vv-bottom-gap, 0px);
        }
      `}</style>
    </div>
  );
}
