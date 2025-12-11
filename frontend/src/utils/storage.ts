/**
 * 안전한 Storage 접근 유틸리티
 * SSR 환경에서 localStorage/sessionStorage에 접근할 때 발생하는 오류 방지
 */

const isStorageAvailable = (type: 'localStorage' | 'sessionStorage'): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isStorageAvailable('localStorage')) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (!isStorageAvailable('localStorage')) return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to set localStorage:', e);
    }
  },

  removeItem: (key: string): void => {
    if (!isStorageAvailable('localStorage')) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove localStorage:', e);
    }
  },

  clear: (): void => {
    if (!isStorageAvailable('localStorage')) return;
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    if (!isStorageAvailable('sessionStorage')) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (!isStorageAvailable('sessionStorage')) return;
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to set sessionStorage:', e);
    }
  },

  removeItem: (key: string): void => {
    if (!isStorageAvailable('sessionStorage')) return;
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove sessionStorage:', e);
    }
  },

  clear: (): void => {
    if (!isStorageAvailable('sessionStorage')) return;
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear sessionStorage:', e);
    }
  }
};
