import { ElectronAPI } from '@electron-toolkit/preload';
import { LetterType } from '../types/renderer.types';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: { loadJson: () => Promise<LetterType[]> };
  }
}
