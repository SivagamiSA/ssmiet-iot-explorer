export const NOTICE_EVENT = "iot:notice";
export const showNotice = (message: string) =>
  window.dispatchEvent(new CustomEvent<string>(NOTICE_EVENT, { detail: message }));
