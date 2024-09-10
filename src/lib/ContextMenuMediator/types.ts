export interface MenuItem {
  divider?: { style: Record<string, string> };
  link?: { text: string };
  popup?: { text: string };
  action?: {
    text: string;
    checked?: boolean;
    handler: () => Promise<unknown> | unknown;
  };
  subMenu?: { text: string; items: MenuItem[] };
}

export interface MenuPosition {
  x: number;
  y: number;
}

export interface MenuSize {
  width: number;
  height: number;
}
