import { useCallback, useRef, useState } from 'react';

interface TableBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const useTableLayout = () => {
  const tableRef = useRef<any>(null);
  const [bounds, setBounds] = useState<TableBounds | null>(null);

  const measureLayout = useCallback(() => {
    if (tableRef.current?.measureInWindow) {
      tableRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        const newBounds = { x, y, width, height };
        setBounds(newBounds);
      });
    }
  }, []);

  return { tableRef, bounds, measureLayout };
};
