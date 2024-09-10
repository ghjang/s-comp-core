import { writable } from "svelte/store";
import { PopUpKind } from "./PopUpKind.js";

interface PopupConfig {
  kind: PopUpKind;
  title: string;
  content: string;
  userInput?: string;
  onConfirm: (userInput?: string) => void;
  onCancel?: () => void;
}

function createPopupStore() {
  const { subscribe, set, update } = writable<PopupConfig | null>(null);

  return {
    subscribe,
    show: (config: PopupConfig) => set(config),
    hide: () => set(null),
    confirm: (userInput?: string) =>
      update((config) => {
        if (config) {
          config.onConfirm(userInput);
        }
        return null;
      }),
    cancel: () =>
      update((config) => {
        if (config && config.onCancel) {
          config.onCancel();
        }
        return null;
      }),
  };
}

export type PopupStore = ReturnType<typeof createPopupStore>;

export class PopUpManager {
  private popupStore: PopupStore;

  constructor() {
    this.popupStore = createPopupStore();
  }

  get store() {
    return this.popupStore;
  }

  show(config: PopupConfig) {
    this.popupStore.show(config);
  }

  hide() {
    this.popupStore.hide();
  }

  confirm(userInput?: string) {
    this.popupStore.confirm(userInput);
  }

  cancel() {
    this.popupStore.cancel();
  }

  handleButtonClicked(event: CustomEvent) {
    const { value, userInput } = event.detail;
    value === "ok" ? this.confirm(userInput) : this.cancel();
  }
}
