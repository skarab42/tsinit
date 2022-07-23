import { existsSync, writeFileSync } from 'fs';
import ts from 'typescript';

export const DEFAULT_FILENAME = 'tsconfig.tsinit.json';

export type OptionCategory = {
  key: string;
  message: string;
};

export type OptionDescription = {
  key: string;
  message: string;
};

export type OptionValue = string | number | boolean | undefined | Array<unknown> | Record<string, unknown>;

export type OptionValueWithMessage = { message: string };

export type Option = {
  name: string;
  type: string | Map<string, number>;
  isFilePath: boolean;
  category: OptionCategory;
  description: OptionDescription;
  transpileOptionValue: OptionValue | OptionValueWithMessage;
  defaultValueDescription: OptionValue | OptionValueWithMessage;
};

export type OptionsNameMap = { optionsNameMap: Map<string, Option> };
export type OptionsCategory = { name: string; options: Option[] };

// @ts-expect-error access to internal API
export const categoriesToSkip = [ts.Diagnostics.Command_line_Options];

export function shouldSkip(option: Option) {
  return (
    !option.category || categoriesToSkip.includes(option.category) || option.description.key.startsWith('Deprecated')
  );
}

export function init(filePath = DEFAULT_FILENAME, overwrite = false) {
  if (!overwrite && existsSync(filePath)) {
    throw new Error(
      `WARNING: file "${filePath}" already exists! If you want to overwrite it use the "--overwrite" option.`,
    );
  }

  // @ts-expect-error access to internal API
  const { optionsNameMap }: OptionsNameMap = ts.getOptionsNameMap();
  const categories: Map<string, OptionsCategory> = new Map();

  optionsNameMap.forEach((option) => {
    if (shouldSkip(option)) {
      return;
    }

    const category = categories.get(option.category.key);

    if (!category) {
      categories.set(option.category.key, {
        name: option.category.message,
        options: [option],
      });
    } else {
      category.options = [...category.options, option];
    }
  });

  const lines: string[] = [];

  function push(line: string, indent = 0) {
    lines.push('  '.repeat(indent) + line);
  }

  push(`{`);
  push(`"compilerOptions": {`, 1);

  [...categories.values()].forEach(({ name, options }) => {
    push(`/** ${name} */`, 2);

    const output: string[][] = [];
    let maxLength = 0;

    options.forEach((option) => {
      const defaultValue = getDefaultValue(option);
      const value = JSON.stringify(defaultValue.value);
      const description = `${option.description['message']} (default: ${value ?? defaultValue.description})`;
      if (!value) {
        console.log(option);
      }
      const comment = value ? '' : '// ';
      const leftSide = `${comment}"${option.name}": ${value},`;
      const rightSide = `// ${description}`;
      maxLength = Math.max(maxLength, leftSide.length);
      output.push([leftSide, rightSide]);
    });

    output.forEach(([a, b]) => {
      push(`${a?.padEnd(maxLength + 1)}${b}`, 2);
    });

    push('', 2);
  });

  push(`}`, 1);
  push(`}`);

  writeFileSync(filePath, lines.join('\n'));

  return filePath;
}

export function getDefaultEmptyValue(option: Option): OptionValue {
  switch (option.type) {
    case 'number':
      return 1;
    case 'boolean':
      return false;
    case 'string':
      return '';
    case 'list':
      return [];
    case 'object':
      return {};
    default:
      return undefined;
  }
}

export function getDefaultValue(option: Option): {
  value: unknown;
  description: string;
} {
  switch (option.type) {
    case 'number':
    case 'boolean':
    case 'string':
      let description = '';
      let value = option.defaultValueDescription;
      if (typeof value === 'string') {
        value = value.replace(/^`|`$/g, '');
        if (option.isFilePath) {
          value = `./${value}`;
        }
      } else if (typeof value === 'object') {
        description = (value as OptionValueWithMessage).message;
        value = getDefaultEmptyValue(option);
      }
      value = value ?? getDefaultEmptyValue(option);
      return { value, description };
    case 'list':
      return { value: [], description: '' };
    case 'object':
      return { value: {}, description: '' };
    default:
      return {
        value: [...(option.type as Map<string, number>).keys()].pop(),
        description: '',
      };
  }
}
