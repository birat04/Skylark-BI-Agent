export interface MondayColumnValue {
  id: string;
  text: string | null;
  type: string;
}

export interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

export interface MondayBoardItemsPage {
  boards: {
    items_page: {
      cursor: string | null;
      items: MondayItem[];
    };
  }[];
}

/** Flat map of column id -> text value, for easier normalization downstream. */
export type FlatMondayItem = {
  id: string;
  name: string;
  columns: Record<string, string | null>;
};

export function flattenItem(item: MondayItem): FlatMondayItem {
  const columns: Record<string, string | null> = {};
  for (const col of item.column_values) {
    columns[col.id] = col.text;
  }
  return { id: item.id, name: item.name, columns };
}
