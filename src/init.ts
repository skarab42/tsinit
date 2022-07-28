import ts from 'unleashed-typescript';
import { existsSync, writeFileSync } from 'node:fs';

export const categoriesToSkip = [ts.Diagnostics.Command_line_Options];

export type OptionWithCategoryAndDescription = ts.CommandLineOption & {
  category: ts.DiagnosticMessage;
  description: ts.DiagnosticMessage;
};

export interface OptionsCategory {
  name: string;
  options: OptionWithCategoryAndDescription[];
}

export type OptionCategories = Map<string, OptionsCategory>;

export interface DefaultOption {
  type: string;
  description: string;
  value: unknown;
  defaultValue: unknown;
}

export type DefaultOptionValue = string | number | boolean | undefined | object | unknown[];

export interface InitOptions {
  filePath?: string;
  overwrite?: boolean;
  commentAll?: boolean;
}

export function isCommandLineOptionWithCategory(
  option: ts.CommandLineOption,
): option is OptionWithCategoryAndDescription {
  return !!option.category && !!option.description;
}

export function shouldSkipOptionName(option: OptionWithCategoryAndDescription): boolean {
  return categoriesToSkip.includes(option.category) || !!option.description.key.startsWith('Deprecated');
}

export function init(options: InitOptions = {}): string {
  const filePath = options.filePath ?? 'tsconfig.tsinit.json';

  if (!options.overwrite && existsSync(filePath)) {
    throw new Error(
      `WARNING: file "${filePath}" already exists! If you want to overwrite it use the "--overwrite" option.`,
    );
  }

  const categories = getOptionGroupedByCategory();
  const output = createConfigurationFileContents(categories, !!options.commentAll);

  writeFileSync(filePath, output);

  return '';
}

export function getOptionGroupedByCategory(): OptionCategories {
  const { optionsNameMap } = ts.getOptionsNameMap();
  const categories: OptionCategories = new Map();

  // eslint-disable-next-line unicorn/no-array-for-each
  optionsNameMap.forEach((optionName) => {
    if (!isCommandLineOptionWithCategory(optionName)) {
      return;
    }

    if (shouldSkipOptionName(optionName)) {
      return;
    }

    const category = categories.get(optionName.category.key);

    if (!category) {
      categories.set(optionName.category.key, {
        name: optionName.category.message,
        options: [optionName],
      });

      return;
    }

    category.options = [...category.options, optionName];
  });

  return categories;
}

export function getDefaultOptionValue(option: OptionWithCategoryAndDescription): DefaultOptionValue {
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

export function getDefaultOption(option: OptionWithCategoryAndDescription): DefaultOption {
  const type = typeof option.type !== 'string' ? 'Map' : option.type;
  const description = option.description.message;

  let value: DefaultOptionValue;
  let defaultValue: DefaultOptionValue;

  if (type === 'Map') {
    value = [...(option.type as Map<string, number>).keys()][0];
  } else if (typeof option.defaultValueDescription === 'object') {
    defaultValue = option.defaultValueDescription.message;
  } else {
    value = option.defaultValueDescription;

    if (typeof value === 'string') {
      value = value.replace(/^`|`$/g, '');

      if (option.isFilePath) {
        value = `./${value}`;
      }
    }

    defaultValue = value;
  }

  if (typeof value === 'undefined') {
    value = getDefaultOptionValue(option);
  }

  defaultValue = defaultValue ?? value;

  return { type, description, value, defaultValue };
}

export function createConfigurationFileContents(categories: OptionCategories, commentAll: boolean): string {
  const lines: string[] = [];

  function push(line: string, indent = 0): void {
    lines.push('  '.repeat(indent) + line);
  }

  push(`{`);
  push(`"compilerOptions": {`, 1);

  for (const { name, options } of categories.values()) {
    push(`/** ${name} */`, 2);

    const output: string[][] = [];

    let maxLength = 0;

    for (const option of options) {
      const defaultOption = getDefaultOption(option);
      const value = JSON.stringify(defaultOption.value);
      const defaultValue = JSON.stringify(defaultOption.defaultValue);
      const description = `${defaultOption.description} (default: ${defaultValue})`;

      const leftSide = `${commentAll ? '// ' : ''}"${option.name}": ${value},`;
      maxLength = Math.max(maxLength, leftSide.length);

      output.push([leftSide, `// ${description}`]);
    }

    for (const [a, b] of output) {
      push(`${a.padEnd(maxLength + 1)}${b}`, 2);
    }

    push('', 2);
  }

  push(`}`, 1);
  push(`}`);

  return lines.join('\n');
}
