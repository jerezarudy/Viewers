import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Button, Header, Icons, useModal } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';
import { Toolbar } from '../Toolbar/Toolbar';
import HeaderPatientInfo from './HeaderPatientInfo';
import { PatientInfoVisibility } from './HeaderPatientInfo/HeaderPatientInfo';
import { preserveQueryParameters } from '@ohif/app';
import { Types } from '@ohif/core';

type ToothNumbering = 'universal' | 'fdi';

function ToothIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M7.1 3.8C5 5.7 4.4 9.2 5 12.7c.5 2.8 1.9 6.6 3.3 8.1.6.7 1.2.9 1.9.6 1.2-.5 1.3-2.6 1.9-4.1.3-.8.7-1.2 1.9-1.2s1.6.4 1.9 1.2c.6 1.5.7 3.6 1.9 4.1.7.3 1.3.1 1.9-.6 1.4-1.5 2.8-5.3 3.3-8.1.6-3.5 0-7-2.1-8.9C19.8 2 16.8 2.2 14.9 3c-.8.3-1.6.5-2.9.5S9.9 3.3 9.1 3C7.2 2.2 4.2 2 7.1 3.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getToothOptions(numbering: ToothNumbering): string[] {
  if (numbering === 'fdi') {
    const options: string[] = [];
    for (const quadrant of [1, 2, 3, 4]) {
      for (let tooth = 1; tooth <= 8; tooth++) {
        options.push(`${quadrant}${tooth}`);
      }
    }
    return options;
  }

  return Array.from({ length: 32 }, (_, idx) => String(idx + 1));
}

function ViewerHeader({
  appConfig,
}: withAppTypes<{
  appConfig: AppTypes.Config;
}>) {
  const { servicesManager, extensionManager, commandsManager } = useSystem();
  const { customizationService } = servicesManager.services;

  const navigate = useNavigate();
  const location = useLocation();

  const onClickReturnButton = () => {
    const { pathname } = location;
    const dataSourceIdx = pathname.indexOf('/', 1);

    const dataSourceName = pathname.substring(dataSourceIdx + 1);
    const existingDataSource = extensionManager.getDataSources(dataSourceName);

    const searchQuery = new URLSearchParams();
    if (dataSourceIdx !== -1 && existingDataSource) {
      searchQuery.append('datasources', pathname.substring(dataSourceIdx + 1));
    }
    preserveQueryParameters(searchQuery);

    navigate({
      pathname: '/',
      search: decodeURIComponent(searchQuery.toString()),
    });
  };

  const { t } = useTranslation();
  const { show } = useModal();

  const root = appConfig as Record<string, unknown>;
  const dental = root?.dental as Record<string, unknown> | undefined;
  const simpleLogin = dental?.simpleLogin as Record<string, unknown> | undefined;
  const simpleLoginEnabled = !!simpleLogin?.enabled;
  const oidcEnabled = Array.isArray(appConfig.oidc) && appConfig.oidc.length > 0;

  const [isDentalModeEnabled, setIsDentalModeEnabled] = useState(false);
  const [toothNumbering, setToothNumbering] = useState<ToothNumbering>('universal');
  const [selectedTooth, setSelectedTooth] = useState<string>('');
  const [isToothSelectorEnabled, setIsToothSelectorEnabled] = useState(true);
  const prevLayoutRef = useRef<{
    numRows: number;
    numCols: number;
    isHangingProtocolLayout?: boolean;
  } | null>(null);

  const dentalModeNavBarClassName = isDentalModeEnabled ? 'bg-primary-primary' : undefined;

  useEffect(() => {
    try {
      sessionStorage.setItem('ohif.dental.enabled', isDentalModeEnabled ? '1' : '0');
      sessionStorage.setItem('ohif.dental.toothNumbering', toothNumbering);
      sessionStorage.setItem('ohif.dental.selectedTooth', selectedTooth);
      sessionStorage.setItem('ohif.dental.toothSelectorEnabled', isToothSelectorEnabled ? '1' : '0');
    } catch {
      // ignore storage errors (privacy mode, disabled storage, etc.)
    }
  }, [isDentalModeEnabled, isToothSelectorEnabled, selectedTooth, toothNumbering]);

  useEffect(() => {
    const handler = () => {
      setIsToothSelectorEnabled(false);
    };

    window.addEventListener('ohif:dental:measurementToolSelected', handler as EventListener);
    return () => {
      window.removeEventListener('ohif:dental:measurementToolSelected', handler as EventListener);
    };
  }, []);

  useEffect(() => {
    const { viewportGridService } = servicesManager.services;
    if (!viewportGridService) {
      return;
    }

    if (isDentalModeEnabled) {
      setIsToothSelectorEnabled(false);
      if (!prevLayoutRef.current) {
        const { layout, isHangingProtocolLayout } = viewportGridService.getState();
        prevLayoutRef.current = {
          numRows: layout.numRows,
          numCols: layout.numCols,
          isHangingProtocolLayout,
        };
      }

      // Default Dental Mode layout: 2x2 ("four up")
      commandsManager.run({
        commandName: 'setViewportGridLayout',
        commandOptions: { numRows: 2, numCols: 2 },
      });

      // Default Dental Mode tool: Zoom
      window.setTimeout(() => {
        commandsManager.run({
          commandName: 'setToolActiveToolbar',
          commandOptions: { toolName: 'Zoom' },
        });
      }, 0);
      return;
    }

    if (prevLayoutRef.current) {
      const { numRows, numCols, isHangingProtocolLayout } = prevLayoutRef.current;
      prevLayoutRef.current = null;

      commandsManager.run({
        commandName: 'setViewportGridLayout',
        commandOptions: { numRows, numCols, isHangingProtocolLayout },
      });
    }
  }, [commandsManager, isDentalModeEnabled, servicesManager.services]);

  const AboutModal = customizationService.getCustomization(
    'ohif.aboutModal'
  ) as Types.MenuComponentCustomization;

  const UserPreferencesModal = customizationService.getCustomization(
    'ohif.userPreferencesModal'
  ) as Types.MenuComponentCustomization;

  const menuOptions = [
    {
      title: AboutModal?.menuTitle ?? t('Header:About'),
      icon: 'info',
      onClick: () =>
        show({
          content: AboutModal,
          title: AboutModal?.title ?? t('AboutModal:About OHIF Viewer'),
          containerClassName: AboutModal?.containerClassName ?? 'max-w-md',
        }),
    },
    {
      title: UserPreferencesModal.menuTitle ?? t('Header:Preferences'),
      icon: 'settings',
      onClick: () =>
        show({
          content: UserPreferencesModal,
          title: UserPreferencesModal.title ?? t('UserPreferencesModal:User preferences'),
          containerClassName:
            UserPreferencesModal?.containerClassName ?? 'flex max-w-4xl p-6 flex-col',
        }),
    },
  ];

  if (oidcEnabled) {
    menuOptions.push({
      title: t('Header:Logout'),
      icon: 'power-off',
      onClick: async () => {
        navigate(`/logout?redirect_uri=${encodeURIComponent(window.location.href)}`);
      },
    });
  } else if (simpleLoginEnabled) {
    menuOptions.push({
      title: t('Header:Logout'),
      icon: 'power-off',
      onClick: async () => {
        navigate('/simple-logout');
      },
    });
  }

  const practiceName = (() => {
    const dentalConfig = (root?.dental as Record<string, unknown> | undefined) ?? undefined;
    const fromDentalConfig =
      dentalConfig && typeof dentalConfig.practiceName === 'string'
        ? (dentalConfig.practiceName as string)
        : null;

    return fromDentalConfig || appConfig.whiteLabeling?.companyName || 'Dental Practice';
  })();

  const toothOptions = getToothOptions(toothNumbering);
  // console.log('patientInfo->', patientInfo);
  // console.log('appConfig->', appConfig);
  return (
    <Header
      className={dentalModeNavBarClassName}
      menuOptions={menuOptions}
      isReturnEnabled={!!appConfig.showStudyList}
      onClickReturnButton={onClickReturnButton}
      WhiteLabeling={appConfig.whiteLabeling}
      Secondary={
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            className="text-primary hover:bg-primary-dark ml-4"
            onClick={() => setIsDentalModeEnabled(prev => !prev)}
            data-cy="toggle-dental-mode"
            title="Dental Mode"
            aria-label="Dental Mode"
          >
            <span className="mr-2 text-sm text-white">Dental Mode</span>
            <span
              className={`relative h-6 w-12 rounded-full transition-colors duration-200 ${
                isDentalModeEnabled ? 'bg-primary-light' : 'bg-secondary-dark'
              }`}
            >
              <span
                className={`absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                  isDentalModeEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </span>
          </Button>
          <Toolbar buttonSection="secondary" />
        </div>
      }
      PatientInfo={
        // !isDentalModeEnabled &&
        appConfig.showPatientInfo !== PatientInfoVisibility.DISABLED && (
          <HeaderPatientInfo
            servicesManager={servicesManager}
            appConfig={appConfig}
          />
        )
      }
      UndoRedo={
        <div className="text-primary flex cursor-pointer items-center">
          <Button
            variant="ghost"
            className="hover:bg-primary-dark"
            onClick={() => {
              commandsManager.run('undo');
            }}
          >
            <Icons.Undo className="" />
          </Button>
          <Button
            variant="ghost"
            className="hover:bg-primary-dark"
            onClick={() => {
              commandsManager.run('redo');
            }}
          >
            <Icons.Redo className="" />
          </Button>
        </div>
      }
    >
      {isDentalModeEnabled ? (
        <div className="relative flex w-full items-center justify-center gap-4 px-2">
          <div className="min-w-0 max-w-[260px] truncate text-sm font-semibold text-white">
            {practiceName}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={`hover:bg-primary-dark ${
                isToothSelectorEnabled ? 'bg-primary-light text-black' : 'text-white'
              }`}
              onClick={() =>
                setIsToothSelectorEnabled(prev => {
                  const next = !prev;
                  commandsManager.run({
                    commandName: 'setDentalActiveMeasurement',
                    commandOptions: { measurementId: '' },
                  });
                  commandsManager.run({
                    commandName: 'setToolActiveToolbar',
                    commandOptions: { toolName: next ? 'ArrowAnnotate' : 'Zoom' },
                  });
                  return next;
                })
              }
              title="Tooth selector"
              aria-label="Toggle tooth selector"
              aria-pressed={isToothSelectorEnabled}
              data-cy="toggle-tooth-selector"
            >
              <ToothIcon className="h-5 w-5" />
            </Button>
            <select
              className="border-white/15 h-7 rounded-md border bg-white/5 px-2 text-xs text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={toothNumbering}
              onChange={e => {
                const next = (e.target.value as ToothNumbering) || 'universal';
                setToothNumbering(next);
                setSelectedTooth('');
              }}
              disabled={!isToothSelectorEnabled}
              aria-label="Tooth numbering"
            >
              <option value="universal">Universal</option>
              <option value="fdi">FDI</option>
            </select>
            <select
              className="border-white/15 h-7 rounded-md border bg-white/5 px-2 text-xs text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedTooth}
              onChange={e => setSelectedTooth(e.target.value)}
              disabled={!isToothSelectorEnabled}
              aria-label="Selected tooth"
            >
              <option value="">Select...</option>
              {toothOptions.map(tooth => (
                <option
                  key={tooth}
                  value={tooth}
                >
                  {tooth}
                </option>
              ))}
            </select>
          </div>

          <Toolbar buttonSection="dental" />
        </div>
      ) : (
        <div className="relative flex justify-center gap-[4px]">
          <Toolbar buttonSection="primary" />
        </div>
      )}
    </Header>
  );
}

export default ViewerHeader;
