import DataEditor, { GridCell, Item, GridColumn, GridCellKind, EditableGridCell } from '@glideapps/glide-data-grid';
import React, { useEffect, useRef, useState } from 'react';

import { ArrayVector, DataFrame, Field, FieldType, PanelProps } from '@grafana/data';
// eslint-disable-next-line import/order
import { useTheme2 } from '@grafana/ui';

import '@glideapps/glide-data-grid/dist/index.css';

import { getDashboardSrv } from 'app/features/dashboard/services/DashboardSrv';
import { DatagridData } from 'app/features/dashboard/state/PanelModel';

import { PanelOptions } from './models.gen';

interface Props extends PanelProps<PanelOptions> {}

export const DataGridPanel: React.FC<Props> = ({ options, data, id, width, height }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelModel = getDashboardSrv().getCurrent()?.getPanelById(id);
  const [gridData, setGridData] = useState<DatagridData[]>([]);

  const theme = useTheme2();
  const gridTheme = {
    accentColor: theme.colors.primary.main,
    accentFg: theme.colors.secondary.main,
    textDark: theme.colors.text.primary,
    textMedium: theme.colors.text.primary,
    textLight: theme.colors.text.primary,
    textBubble: theme.colors.text.primary,
    textHeader: theme.colors.text.primary,
    bgCell: theme.colors.background.primary,
    bgCellMedium: theme.colors.background.primary,
    bgHeader: theme.colors.background.secondary,
    bgHeaderHasFocus: theme.colors.background.secondary,
    bgHeaderHovered: theme.colors.background.secondary,
  };

  useEffect(() => {
    if (!options.usePanelData) {
      setGridData([]);
      panelModel?.setData([]);
      return;
    } else {
      if (panelModel?.data?.length) {
        return;
      }
    }

    const datagridData: DatagridData[] = [];

    if (!data.series[0]) {
      throw new Error('OH NO 3');
    }

    data.series[0].fields.forEach((field) => {
      datagridData.push({
        name: field.name,
        values: field.values.toArray(),
      });
    });

    setGridData(datagridData);
    panelModel?.setData(datagridData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.series, id, options.usePanelData, panelModel?.data]);

  const getCorrectData = (): DataFrame => {
    if (options.usePanelData) {
      if (panelModel?.data?.length) {
        const fields: Field[] = [];
        panelModel.data.forEach((data) => {
          fields.push({
            name: data.name,
            type: FieldType.string,
            values: new ArrayVector(data.values),
            config: {},
          });
        });
        return {
          fields,
          length: panelModel.data[0].values.length,
        };
      }
    }

    return data.series[0];
  };

  const getColumns = (): GridColumn[] => {
    const frame = getCorrectData();

    //TODO getDisplayName might be better, also calculate width dynamically
    return frame.fields.map((f) => ({ title: f.name, width: f.type === FieldType.string ? 100 : 50 }));
  };

  const getCellContent = ([col, row]: Item): GridCell => {
    const frame = getCorrectData();
    const field: Field = frame.fields[col];

    if (!field) {
      throw new Error('OH NO');
    }

    const value = field.values.get(row);

    if (value === undefined || value === null) {
      throw new Error('OH NO 2');
    }

    //TODO there is an error with number gridcells when opening the overlay and editing. so I ignored and made everything text for now

    return {
      kind: GridCellKind.Text,
      data: value,
      allowOverlay: options.usePanelData ? true : false,
      readonly: options.usePanelData ? false : true,
      displayData: value.toString(),
    };

    // switch (field.type) {
    //   case FieldType.number:
    //     return {
    //       kind: GridCellKind.Number,
    //       data: value.toString(),
    //       allowOverlay: true,
    //       readonly: false,
    //       displayData: value.toString(),
    //     };
    //   case FieldType.time:
    //     return {
    //       kind: GridCellKind.Text,
    //       data: value,
    //       allowOverlay: true,
    //       readonly: false,
    //       displayData: new Date(value).toTimeString(),
    //     };
    //   case FieldType.string:
    //     return {
    //       kind: GridCellKind.Text,
    //       data: value,
    //       allowOverlay: true,
    //       readonly: false,
    //       displayData: value.toString(),
    //     };
    //   default:
    //     //TODO ?????? ^^^^^^
    //     return {
    //       kind: GridCellKind.Text,
    //       data: value,
    //       allowOverlay: true,
    //       readonly: false,
    //       displayData: value.toString(),
    //     };
    // }
  };

  const onCellEdited = (cell: Item, newValue: EditableGridCell) => {
    const frame = getCorrectData();

    const [col, row] = cell;
    const field: Field = frame.fields[col];

    if (!field) {
      throw new Error('OH NO 3');
    }

    const values = field.values.toArray();
    values[row] = newValue.data;

    if (panelModel !== undefined && panelModel !== null && panelModel.data !== undefined && panelModel.data.length) {
      panelModel.data[col].values[row] = newValue.data;
    }

    field.values = new ArrayVector(values);
  };

  const createNewCol = () => {
    if (!panelModel || !panelModel.data) {
      return;
    }

    let len = 50;
    if (panelModel.data.length) {
      len = panelModel.data[0].values.length;
    }

    const newData = [...panelModel.data];

    newData.push({
      name: inputRef.current?.value ?? 'PLACEHOLDER',
      values: new Array(len).fill(''),
    });

    setGridData(newData);
    panelModel.setData(newData);
  };

  const createNewRow = () => {
    if (!panelModel || !panelModel.data) {
      return;
    }

    const newData = [...panelModel.data];

    newData.forEach((data) => {
      data.values.push('');
    });

    setGridData(newData);
    panelModel.setData(newData);
  };

  if (!document.getElementById('portal')) {
    const portal = document.createElement('div');
    portal.id = 'portal';
    document.body.appendChild(portal);
  }

  //TODO multiple series support
  const numRows = getCorrectData().length;

  return (
    <>
      <DataEditor
        getCellContent={getCellContent}
        columns={getColumns()}
        rows={numRows}
        width={'100%'}
        height={'90%'} //omg this is so ugly
        theme={gridTheme}
        onCellEdited={onCellEdited}
      />
      <input type="text" ref={inputRef} />
      <button onClick={() => createNewCol()}>Create new col</button>
      <button onClick={() => createNewRow()}>Create new row</button>
    </>
  );
};
