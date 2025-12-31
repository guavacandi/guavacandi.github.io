import { useMemo, useState } from "react";

type Op = "+" | "-" | "×" | "÷" | null;

export default function CalculatorWindow() {
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op>(null);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(false);

  const currentValue = useMemo(() => {
    const n = Number(display);
    return Number.isFinite(n) ? n : 0;
  }, [display]);

  const setDisplaySafe = (n: number) => {
    if (!Number.isFinite(n)) {
      setDisplay("Error");
      setError(true);
      setTyping(false);
      return;
    }
    setDisplay(String(n));
    setError(false);
  };

  const clearAll = () => {
    setDisplay("0");
    setAcc(null);
    setOp(null);
    setTyping(false);
    setError(false);
  };

  const clearEntry = () => {
    setDisplay("0");
    setTyping(false);
    setError(false);
  };

  const inputDigit = (d: string) => {
    if (error) clearAll();
    setDisplay((prev) => {
      if (!typing || prev === "0") return d;
      if (prev.length >= 16) return prev;
      return prev + d;
    });
    setTyping(true);
  };

  const inputDot = () => {
    if (error) clearAll();
    setDisplay((prev) => {
      if (!typing) return "0.";
      if (prev.includes(".")) return prev;
      return prev + ".";
    });
    setTyping(true);
  };

  const applyOp = (a: number, b: number, operation: Exclude<Op, null>) => {
    switch (operation) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? Number.POSITIVE_INFINITY : a / b;
    }
  };

  const chooseOp = (next: Exclude<Op, null>) => {
    if (error) return;

    if (acc === null) {
      setAcc(currentValue);
      setOp(next);
      setTyping(false);
      return;
    }

    if (!typing) {
      setOp(next);
      return;
    }

    if (op) {
      const result = applyOp(acc, currentValue, op);
      setAcc(result);
      setDisplaySafe(result);
    } else {
      setAcc(currentValue);
    }

    setOp(next);
    setTyping(false);
  };

  const equals = () => {
    if (error) return;
    if (acc === null || !op) return;
    const result = applyOp(acc, currentValue, op);
    setDisplaySafe(result);
    setAcc(null);
    setOp(null);
    setTyping(false);
  };

  return (
    <div className="calculator" tabIndex={0}>
      <div className="calculator-display">{display}</div>

      <div className="calculator-buttons calculator-buttons-xp">
        {/* Row 1 */}
        <div className="calculator-button" onClick={clearAll}>C</div>
        <div className="calculator-button" onClick={clearEntry}>E</div>
        <div className="calculator-button" onClick={equals}>=</div>
        <div className="calculator-button" data-action="operator" onClick={() => chooseOp("×")}>×</div>

        {/* Row 2 */}
        <div className="calculator-button" onClick={() => inputDigit("7")}>7</div>
        <div className="calculator-button" onClick={() => inputDigit("8")}>8</div>
        <div className="calculator-button" onClick={() => inputDigit("9")}>9</div>
        <div className="calculator-button" data-action="operator" onClick={() => chooseOp("÷")}>÷</div>

        {/* Row 3 */}
        <div className="calculator-button" onClick={() => inputDigit("4")}>4</div>
        <div className="calculator-button" onClick={() => inputDigit("5")}>5</div>
        <div className="calculator-button" onClick={() => inputDigit("6")}>6</div>
        <div className="calculator-button" data-action="operator" onClick={() => chooseOp("-")}>−</div>

        {/* Row 4 */}
        <div className="calculator-button" onClick={() => inputDigit("1")}>1</div>
        <div className="calculator-button" onClick={() => inputDigit("2")}>2</div>
        <div className="calculator-button" onClick={() => inputDigit("3")}>3</div>

        {/* Tall + spans rows 4–5 */}
        <div className="calculator-button plus-button-xp" data-action="operator" onClick={() => chooseOp("+")}>+</div>

        {/* Row 5 */}
        <div className="calculator-button wide zero-button-xp" onClick={() => inputDigit("0")}>0</div>
        <div className="calculator-button dot-button-xp" onClick={inputDot}>.</div>
      </div>

    </div>
  );
}
