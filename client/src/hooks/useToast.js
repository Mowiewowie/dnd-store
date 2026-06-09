import { useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState('');
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }
  return { toast, showToast };
}
