import inquirer from 'inquirer';
import type { ISelectChoice } from '../types/interfaces.js';
import type { ValidationResult } from './validators.js';
import { parseMoneyInput } from '../utils/money.js';
import { validateAmount } from './validators.js';

const ANSWER_KEY = 'value';
const DEFAULT_PAGE_SIZE = 12;

export interface ITextPromptOptions {
  readonly message: string;
  readonly defaultValue?: string;
  readonly validate?: (value: string) => ValidationResult;
}

export const askText = async (options: ITextPromptOptions): Promise<string> => {
  const { message, defaultValue, validate } = options;

  const answers = await inquirer.prompt<{ value: string }>([
    {
      type: 'input',
      name: ANSWER_KEY,
      message,
      ...(defaultValue === undefined ? {} : { default: defaultValue }),
      ...(validate === undefined ? {} : { validate: (input: string) => validate(input) }),
    },
  ]);

  return answers.value.trim();
};

export const askMoney = async (message: string): Promise<number> => {
  const raw = await askText({ message, validate: validateAmount });
  const parsed = parseMoneyInput(raw);

  if (parsed === null) {
    throw new Error('Сумма прошла валидацию, но не распарсилась — проверь parseMoneyInput');
  }

  return parsed;
};

export const askConfirm = async (message: string, defaultValue = false): Promise<boolean> => {
  const answers = await inquirer.prompt<{ value: boolean }>([
    { type: 'confirm', name: ANSWER_KEY, message, default: defaultValue },
  ]);

  return answers.value;
};

export const askSelect = async <TValue>(
  message: string,
  choices: readonly ISelectChoice<TValue>[],
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<TValue> => {
  const prepared = choices.map((choice) =>
    choice.disabled === undefined || choice.disabled === false
      ? { name: choice.name, value: choice.value }
      : { name: choice.name, value: choice.value, disabled: choice.disabled },
  );

  const answers = (await inquirer.prompt([
    {
      type: 'list',
      name: ANSWER_KEY,
      message,
      pageSize,
      loop: false,
      choices: prepared,
    },
  ])) as { value: TValue };

  return answers.value;
};

export const pressEnter = async (message = 'Enter — продолжить'): Promise<void> => {
  await inquirer.prompt<{ value: string }>([{ type: 'input', name: ANSWER_KEY, message }]);
};