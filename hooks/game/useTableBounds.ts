import { useCallback } from 'react';
import { DEFAULT_TABLE_WIDTH, DEFAULT_TABLE_HEIGHT } from '../../utils/constants';

interface DropBounds {
  width: number;
  height: number;
}

export function useTableBounds(dropBounds: React.MutableRefObject<DropBounds>) {
  const getTableBounds = useCallback(() => {
    const bounds = dropBounds.current;
    if (bounds.width > 0 && bounds.height > 0) {
      return bounds;
    }
    return { width: DEFAULT_TABLE_WIDTH, height: DEFAULT_TABLE_HEIGHT };
  }, [dropBounds]);

  return { getTableBounds };
}
