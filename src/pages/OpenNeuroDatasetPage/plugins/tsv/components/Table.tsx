import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
} from "@mui/material";

type Order = "asc" | "desc";

interface TableProps {
  headers: string[];
  rows: string[][];
}

const TsvTable: React.FC<TableProps> = ({ headers, rows }) => {
  const [orderBy, setOrderBy] = useState<number>(0);
  const [order, setOrder] = useState<Order>("asc");

  const handleSort = (columnIndex: number) => {
    const isAsc = orderBy === columnIndex && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(columnIndex);
  };

  const sortedRows = useMemo(() => {
    const comparator = (a: string[], b: string[]): number => {
      const valueA = a[orderBy];
      const valueB = b[orderBy];

      // Try to compare as numbers if both values can be converted to numbers
      const numA = Number(valueA);
      const numB = Number(valueB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return order === "asc" ? numA - numB : numB - numA;
      }

      // Otherwise compare as strings
      return order === "asc"
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    };

    return [...rows].sort(comparator);
  }, [rows, order, orderBy]);

  return (
    <Box sx={{ width: "100%", overflow: "auto" }}>
      <TableContainer component={Paper} sx={{ maxHeight: "70vh" }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {headers.map((header, index) => (
                <TableCell
                  key={index}
                  sortDirection={orderBy === index ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === index}
                    direction={orderBy === index ? order : "asc"}
                    onClick={() => handleSort(index)}
                  >
                    {header}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                sx={{
                  "&:nth-of-type(odd)": {
                    backgroundColor: "rgba(0, 0, 0, 0.02)",
                  },
                }}
              >
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TsvTable;
