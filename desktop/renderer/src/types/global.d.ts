export {};

declare global {
  interface Window {
    DevPilot: {
      baseUrl:string;
      getBaseUrl(): string;
      pickRepo(): Promise<string | null>;
    };
  }
}
