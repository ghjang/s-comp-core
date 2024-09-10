import { type ComponentType } from "svelte";

export interface ChildComponentInfo {
  componentClass?: string | ComponentType;
  componentClassName?: string;
  componentNodeName?: string;
  customElementName?: string | null;
  props?: Record<string, any>;
  [key: string]: any;
}

export interface FloorData {
  floorId: string;
  ancestorFloorId: string | null;
  nonFloorParentInfo: Record<string, any> | null;
  childComponentInfo: ChildComponentInfo;
  [key: string]: any;
}
