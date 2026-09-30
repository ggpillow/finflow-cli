function calculateTotal (numbers: number[]): number {
    return numbers.reduce((acc, curr) => acc + curr, 0);
}

function calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return calculateTotal(numbers) / numbers.length;
}

function formatCurrency(amount: number, symbol: string): string {
    return `${amount} ${symbol}`;
}

function getTopValues(count: number, numbers: number[]): number[] {
  return numbers.sort((a, b) => b - a).slice(0, count);
}

function printSummary(number: number[]): void {
    const count = number.length;
    const sum = number.reduce((acc, curr) => acc + curr, 0);
    const average = count === 0 ? 0 : sum / count;

    console.log(`Количество: ${count}`);
    console.log(`Сумма: ${sum}`);
    console.log(`Среднее: ${average}`);

}

console.log(calculateTotal([1000, 2000, 3000]));
console.log(calculateAverage([1000, 2000, 3000]));
console.log(formatCurrency(1000, 'P'));
console.log(getTopValues(2, [100, 500, 200, 800]));
printSummary([1000, 2000, 3000]);