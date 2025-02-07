export const encodeUint8ArrayToBase64 = (array: Uint8Array): string => {
  let binary = "";
  const length = array.byteLength;
  for (let i = 0; i < length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
};

export const decodeBase64ToArrayBuffer = (base64: string): Uint8Array => {
  const binary_string = window.atob(base64);
  const bytes = new Uint8Array(binary_string.length);
  for (let i = 0; i < binary_string.length; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};
