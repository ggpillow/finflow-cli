let income: number = 5000;
let expenses: number = 3000;
let savings: number = 500;

function calculateNetIncome(income: number, expenses: number): number {
    return income - expenses;
}

function calculateRemaining(netIncome: number, savings: number) {
    return netIncome - savings
}

const netIncome = calculateNetIncome(income, expenses);
const remainig = calculateRemaining(netIncome, savings);

console.log(income);
console.log(expenses);
console.log(savings);
console.log(netIncome);
console.log(remainig);
