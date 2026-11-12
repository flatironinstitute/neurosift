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
  IconButton,
  Tooltip,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

type Order = "asc" | "desc";

interface TableProps {
  headers: string[];
  rows: string[][];
}

const TsvTable: React.FC<TableProps> = ({ headers, rows }) => {
  const [orderBy, setOrderBy] = useState<number | null>(null);
  const [order, setOrder] = useState<Order>("asc");

  const handleSort = (columnIndex: number) => {
    const isAsc = orderBy === columnIndex && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(columnIndex);
  };

  const handleReset = () => {
    setOrderBy(null);
    setOrder("asc");
  };

  const sortedRows = useMemo(() => {
    if (orderBy === null) return rows;

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
              <TableCell padding="none" sx={{ width: 40 }}>
                <Tooltip title="Reset to original order">
                  <IconButton
                    onClick={handleReset}
                    size="small"
                    sx={{ visibility: orderBy === null ? "hidden" : "visible" }}
                  >
                    <RestartAltIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
              {headers.map((header, index) => (
                <TableCell
                  key={index}
                  sortDirection={orderBy === index ? order : false}
                  sx={{ minWidth: 100 }}
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
                <TableCell padding="none"></TableCell>
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
