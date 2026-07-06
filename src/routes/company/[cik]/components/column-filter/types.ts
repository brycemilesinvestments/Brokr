export type SortOrder = "asc" | "desc";
export type SortMode = "text" | "date";

export type SecondaryFilterProps = {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onSelectedChange: (selected: Set<string>) => void;
};

export type ColumnFilterProps = {
  label: string;
  options: string[];
  selected: Set<string>;
  onSelectedChange: (selected: Set<string>) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  sortMode?: SortMode;
  isActiveSort?: boolean;
  secondaryFilter?: SecondaryFilterProps;
};

export type SortButtonProps = {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
};
