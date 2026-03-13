"use client";

import { useState, useCallback } from "react";
import {
  ColumnDef,
  ColumnResizeMode,
  ColumnOrderState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  GlobalFilterTableState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
}

function globalFilterFn(
  row: { getValue: (id: string) => unknown },
  _columnId: string,
  filterValue: string
): boolean {
  const search = filterValue.toLowerCase();
  const asin = String(row.getValue("asin") ?? "").toLowerCase();
  const title = String(row.getValue("title") ?? "").toLowerCase();
  const brand = String(row.getValue("brand") ?? "").toLowerCase();
  const sku = String(row.getValue("sku") ?? "").toLowerCase();
  const domain = String(row.getValue("domainName") ?? "").toLowerCase();
  return (
    asin.includes(search) ||
    title.includes(search) ||
    brand.includes(search) ||
    sku.includes(search) ||
    domain.includes(search)
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    columnResizeMode,
    state: {
      sorting,
      globalFilter,
      columnOrder,
    } as GlobalFilterTableState & { sorting: SortingState; columnOrder: ColumnOrderState },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnOrderChange: setColumnOrder,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 50 },
    },
  });

  // Column drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", columnId);
    // Make the drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedColumnId(null);
    setDropTargetId(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (columnId !== draggedColumnId) {
      setDropTargetId(columnId);
    }
  }, [draggedColumnId]);

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const sourceColumnId = e.dataTransfer.getData("text/plain");
    if (!sourceColumnId || sourceColumnId === targetColumnId) return;

    const currentOrder = columnOrder.length > 0
      ? columnOrder
      : table.getAllLeafColumns().map((c) => c.id);

    const sourceIndex = currentOrder.indexOf(sourceColumnId);
    const targetIndex = currentOrder.indexOf(targetColumnId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(sourceIndex, 1);
    newOrder.splice(targetIndex, 0, sourceColumnId);
    setColumnOrder(newOrder);
    setDraggedColumnId(null);
    setDropTargetId(null);
  }, [columnOrder, table]);

  return (
    <div>
      <DataTableToolbar table={table} />
      <div className="rounded-md border overflow-x-auto">
        <Table style={{ width: table.getCenterTotalSize() }}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`relative group select-none ${
                      dropTargetId === header.id ? "bg-primary/10" : ""
                    } ${draggedColumnId === header.id ? "opacity-50" : ""}`}
                    style={{ width: header.getSize() }}
                    draggable={header.column.id !== "imageUrl"}
                    onDragStart={(e) => handleDragStart(e, header.column.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, header.column.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, header.column.id)}
                  >
                    <div className={`flex items-center gap-1 ${
                      header.column.id !== "imageUrl" ? "cursor-grab active:cursor-grabbing" : ""
                    }`}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </div>
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onDoubleClick={() => header.column.resetSize()}
                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none transition-colors ${
                          header.column.getIsResizing()
                            ? "bg-primary"
                            : "bg-transparent group-hover:bg-border"
                        }`}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="overflow-hidden"
                      style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
