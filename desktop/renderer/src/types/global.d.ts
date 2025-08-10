export {};

declare global {
  interface Window {
    DevPilot: {
      getBaseUrl(): string;
      pickRepo(): Promise<string | null>;
    };
  }
}
