export class InfoParser {
  static parse(infoString: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = infoString.split('\r\n');
    let currentSection = 'default';

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        if (trimmedLine.startsWith('# ')) {
          currentSection = trimmedLine.substring(2).toLowerCase();
          result[currentSection] = {};
        }
        continue;
      }

      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmedLine.substring(0, colonIndex);
      const value = trimmedLine.substring(colonIndex + 1);

      if (typeof result[currentSection] === 'object' && result[currentSection] !== null) {
        (result[currentSection] as Record<string, string>)[key] = value;
      }
    }

    return result;
  }

  static getVersion(info: Record<string, unknown>): string | null {
    const server = info.server as Record<string, string> | undefined;
    if (!server) return null;

    return server.valkey_version || server.redis_version || null;
  }

  static isValkey(info: Record<string, unknown>): boolean {
    const server = info.server as Record<string, string> | undefined;
    if (!server) return false;

    return 'valkey_version' in server;
  }
}
