export type EnvItemType = 'SECRET' | 'COMMENT' | 'EMPTY';

export interface EnvItem {
  type: EnvItemType;
  key: string | null;
  value: string | null;
  sortOrder: number;
}

export function parseEnv(content: string): EnvItem[] {
  const lines = content.split(/\r?\n/);

  return lines.map((line, index) => {
    /**
     * EMPTY
     *
     * Termasuk:
     *
     * ""
     * " "
     * "    "
     */
    if (line.trim() === '') {
      return {
        type: 'EMPTY',
        key: null,
        value: line,
        sortOrder: index,
      };
    }

    /**
     * COMMENT
     *
     * # COMMENT
     * #COMMENT
     */
    if (line.trimStart().startsWith('#')) {
      return {
        type: 'COMMENT',
        key: null,
        value: line,
        sortOrder: index,
      };
    }

    /**
     * SECRET
     *
     * KEY=value
     */
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      throw new Error(`Invalid environment variable format at line ${index + 1}: ${line}`);
    }

    const [, key, value] = match;

    return {
      type: 'SECRET',
      key,
      value,
      sortOrder: index,
    };
  });
}
