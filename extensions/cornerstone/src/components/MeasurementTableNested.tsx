import React, { useMemo, useState } from 'react';
import { Button, Icons, Input, MeasurementTable } from '@ohif/ui-next';
import { useSystem } from '@ohif/core';

/**
 * This is a measurement table that is designed to be nested inside
 * the accordion groups.
 */
export default function MeasurementTableNested(props) {
  const { title, items, group, customHeader } = props;
  const { commandsManager } = useSystem();
  const [filterText, setFilterText] = useState('');
  const [sortKey, setSortKey] = useState<'index' | 'label' | 'value'>('index');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sectionTitle = title || 'Measurements';
  const enableFilterSort = true;

  const data = useMemo(() => {
    const base = Array.isArray(items) ? items : [];

    const needle = filterText.trim().toLowerCase();
    const filtered =
      !enableFilterSort || !needle
        ? base
        : base.filter(item => {
            const label = String(item?.label || item?.toolName || '').toLowerCase();
            return label.includes(needle);
          });

    if (!enableFilterSort || sortKey === 'index') {
      return filtered;
    }

    const getNumericValue = item => {
      const text = Array.isArray(item?.displayText?.primary)
        ? item.displayText.primary.join(' ')
        : '';
      const match = text.match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : null;
    };

    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'label') {
        const la = String(a?.label || '').toLowerCase();
        const lb = String(b?.label || '').toLowerCase();
        return la.localeCompare(lb);
      }

      const va = getNumericValue(a);
      const vb = getNumericValue(b);
      if (va == null && vb == null) {
        return 0;
      }
      if (va == null) {
        return 1;
      }
      if (vb == null) {
        return -1;
      }
      return va - vb;
    });

    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [enableFilterSort, filterText, items, sortDir, sortKey]);

  const onAction = (e, command, uid) => {
    commandsManager.run(command, { uid, annotationUID: uid, displayMeasurements: data });
  };

  return (
    <MeasurementTable
      title={sectionTitle}
      data={data}
      onAction={onAction}
      {...group}
      key={group.key}
    >
      <MeasurementTable.Header key="measurementTableHeader">
        {enableFilterSort && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <div className="flex-1">
              <Input
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder={
                  sectionTitle === 'Additional Findings'
                    ? 'Filter findings...'
                    : 'Filter measurements...'
                }
                aria-label={sectionTitle === 'Additional Findings' ? 'Filter findings' : 'Filter'}
              />
            </div>
            <select
              className="border-white/15 h-7 rounded-md border bg-white/5 px-2 text-sm text-black outline-none"
              value={`${sortKey}:${sortDir}`}
              onChange={e => {
                const [nextKey, nextDir] = e.target.value.split(':');
                setSortKey(nextKey as typeof sortKey);
                setSortDir(nextDir as typeof sortDir);
              }}
              aria-label={
                sectionTitle === 'Additional Findings' ? 'Sort findings' : 'Sort measurements'
              }
            >
              <option value="index:asc">Default</option>
              <option value="label:asc">Label A-Z</option>
              <option value="label:desc">Label Z-A</option>
              <option value="value:asc">Value Low-High</option>
              <option value="value:desc">Value High-Low</option>
            </select>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setFilterText('')}
              disabled={!filterText}
              aria-label="Clear filter"
              title="Clear filter"
            >
              <Icons.Clear className="h-5 w-5" />
            </Button>
          </div>
        )}
        {customHeader && group.isFirst && customHeader({ ...props, items: props.allItems })}
      </MeasurementTable.Header>
      <MeasurementTable.Body key="measurementTableBody" />
    </MeasurementTable>
  );
}
