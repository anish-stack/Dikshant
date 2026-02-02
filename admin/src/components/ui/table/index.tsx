import { ReactNode } from "react";

// Props
interface TableProps {
  children: ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

interface TableCellProps {
  children: ReactNode;
  isHeader?: boolean;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
  scope?: "col" | "row" | "colgroup" | "rowgroup";
}

// Helper: Simple className merger (replaces cn)
const classNames = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(" ");
};

// Table
const Table: React.FC<TableProps> = ({ children, className = "" }) => {
  return (
    <div className="relative w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`.trim()}>
        {children}
      </table>
    </div>
  );
};

// TableHeader
const TableHeader: React.FC<TableHeaderProps> = ({ children, className = "" }) => {
  return <thead className={className}>{children}</thead>;
};

// TableBody
const TableBody: React.FC<TableBodyProps> = ({ children, className = "" }) => {
  return <tbody className={className}>{children}</tbody>;
};

// TableRow
const TableRow: React.FC<TableRowProps> = ({ children, className = "", onClick }) => {
  return (
    <tr
      className={classNames(
        "border-b transition-colors hover:bg-gray-50 dark:hover:bg-white/5",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

// TableCell
const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className = "",
  colSpan,
  rowSpan,
  scope = "col",
}) => {
  const CellTag = isHeader ? "th" : "td";

  return (
    <CellTag
      className={classNames(
        "p-4 text-left align-middle",
        isHeader && "font-medium text-gray-900 dark:text-white",
        className
      )}
      colSpan={colSpan}
      rowSpan={rowSpan}
      scope={isHeader ? scope : undefined}
    >
      {children}
    </CellTag>
  );
};

export { Table, TableHeader, TableBody, TableRow, TableCell };