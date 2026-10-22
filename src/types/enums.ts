export enum TransactionType {
  Income = 'income',
  Expense = 'expense',
}

export enum Category {
  Food = 'food',
  Housing = 'housing',
  Transport = 'transport',
  Study = 'study',
  Fun = 'fun',
  Health = 'health',
  Other = 'other',
}

export enum Period {
  Today = 'today',
  Week = 'week',
  Month = 'month',
  All = 'all',
}

export enum Currency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR',
}

export enum MainAction {
  Dashboard = 'dashboard',
  AddTransaction = 'add-transaction',
  Limits = 'limits',
  Profile = 'profile',
  Accounts = 'accounts',
  ExportCsv = 'export-csv',
  Exit = 'exit',
}

export enum AccountAction {
  Create = 'create',
  Select = 'select',
  Delete = 'delete',
  Back = 'back',
}

export enum TransactionAction {
  Add = 'add',
  Remove = 'remove',
  Back = 'back',
}

export enum EnvelopeAction {
  Set = 'set',
  Remove = 'remove',
  Back = 'back',
}