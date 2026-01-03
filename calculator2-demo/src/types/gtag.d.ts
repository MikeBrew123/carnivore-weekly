interface Window {
  gtag?: (
    command: string,
    action: string,
    config?: Record<string, any>
  ) => void;
}
