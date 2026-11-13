// Small services every widget may call (sound, toasts, dialogs). GameView installs the real ones at start.
export interface ServicesT {
  sfx(name: string, volume?: number): void;
  toast(text: string, error?: boolean): void;
  big(text: string): void;
  confirm(o: { title: string; body: string; ok?: string; danger?: boolean; onOk: () => void; onCancel?: () => void }): void;
}

export const Services: ServicesT = {
  sfx() {},
  toast() {},
  big() {},
  confirm(o) { o.onOk(); },
};
