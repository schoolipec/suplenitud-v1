"use client";

import { MantineProvider } from "@mantine/core";
import { ReactNode, useMemo } from "react";

const LIGHT_COLORS = {
  navy: "#082942",
  navy2: "#123e59",
  paper: "#f7fcfe",
  mist: "#e7f5fb",
  ink: "#082942",
  muted: "#46647a",
  line: "#c8e0eb",
  card: "#fff",
  green: "#328045",
  lime: "#b6dc26",
};

const DARK_COLORS = {
  navy: "#061a2a",
  navy2: "#103b54",
  paper: "#071d2e",
  mist: "#0e3148",
  ink: "#eaf8ff",
  muted: "#bad5e1",
  line: "#265775",
  card: "#0d2e44",
  green: "#328045",
  lime: "#b6dc26",
};

export function AdminMantineProvider({ children }: { children: ReactNode }) {
  const theme = useMemo(
    () => ({
      colors: {
        dark: [
          DARK_COLORS.line,
          DARK_COLORS.muted,
          DARK_COLORS.muted,
          DARK_COLORS.ink,
          DARK_COLORS.card,
          DARK_COLORS.paper,
          DARK_COLORS.paper,
          DARK_COLORS.paper,
          DARK_COLORS.paper,
          DARK_COLORS.navy,
        ] as const,
        gray: [
          LIGHT_COLORS.paper,
          LIGHT_COLORS.mist,
          LIGHT_COLORS.line,
          LIGHT_COLORS.muted,
          LIGHT_COLORS.muted,
          LIGHT_COLORS.muted,
          LIGHT_COLORS.ink,
          LIGHT_COLORS.ink,
          LIGHT_COLORS.ink,
          LIGHT_COLORS.navy,
        ] as const,
        blue: [
          "#e7f5fb",
          "#d0ecf7",
          "#9fd8f0",
          "#6bc4e8",
          "#46b0e1",
          "#329cda",
          "#2890d0",
          "#1f7bb5",
          "#1a6b9f",
          "#153b52",
        ] as const,
        green: [
          "#e8f5ea",
          "#d0ead5",
          "#a1d7af",
          "#72c489",
          "#4db063",
          "#328045",
          "#2a6d3a",
          "#215a2e",
          "#1a4722",
          "#0d2411",
        ] as const,
        lime: [
          "#f5fcde",
          "#ebf9c2",
          "#daf497",
          "#c8ef6b",
          "#b9eb3f",
          "#b6dc26",
          "#aad01f",
          "#9dc419",
          "#90b813",
          "#5a7206",
        ] as const,
      },
      primaryColor: "green",
      primaryShade: 6,
      fontFamily: "Arial, Helvetica, sans-serif",
      headings: {
        fontFamily: "Arial, Helvetica, sans-serif",
      },
      components: {
        Button: {
          defaultProps: {
            size: "sm",
          },
        },
        Input: {
          defaultProps: {
            size: "sm",
          },
        },
        Select: {
          defaultProps: {
            size: "sm",
          },
        },
        Table: {
          defaultProps: {
            striped: true,
          },
        },
      },
    } as const),
    []
  );

  return <MantineProvider theme={theme}>{children}</MantineProvider>;
}
