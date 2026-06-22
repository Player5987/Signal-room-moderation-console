// Pure classification-metric functions. No I/O, no model calls — just math on
// (actual, predicted) pairs. Kept separate so they're easy to read and test.
//
// These are the SAME metrics you compute for any ML classifier; here they
// measure how good the moderation model is against a labeled set.

export interface Prediction {
  expected: string; // the true label
  predicted: string; // what the model said
}

export interface CategoryMetrics {
  category: string;
  support: number; // how many true examples of this category exist
  precision: number; // of items predicted as this category, fraction correct
  recall: number; // of true items of this category, fraction caught
  f1: number; // harmonic mean of precision and recall
}

export interface EvalReport {
  total: number;
  accuracy: number; // fraction of all predictions that were exactly right
  macroPrecision: number; // unweighted mean precision across categories
  macroRecall: number;
  macroF1: number;
  perCategory: CategoryMetrics[];
  // confusion[actual][predicted] = count
  confusion: Record<string, Record<string, number>>;
  labels: string[];
}

// Build a confusion matrix: rows are the true label, columns the predicted one.
// The diagonal (actual === predicted) is correct; everything off-diagonal is an error.
export function confusionMatrix(
  preds: Prediction[],
  labels: string[],
): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const a of labels) {
    matrix[a] = {};
    for (const p of labels) matrix[a][p] = 0;
  }
  for (const { expected, predicted } of preds) {
    if (matrix[expected] && predicted in matrix[expected]) {
      matrix[expected][predicted] += 1;
    }
  }
  return matrix;
}

// Precision/recall/F1 for one category, read straight off the confusion matrix.
//   TP = matrix[c][c]              (predicted c, and it really was c)
//   FP = sum over a!=c of matrix[a][c]   (predicted c, but it was something else)
//   FN = sum over p!=c of matrix[c][p]   (was c, but we predicted something else)
function categoryMetrics(
  c: string,
  labels: string[],
  matrix: Record<string, Record<string, number>>,
): CategoryMetrics {
  const tp = matrix[c][c];
  let fp = 0;
  let fn = 0;
  let support = 0;
  // FP: column c minus the diagonal (predicted c, but was actually something else).
  for (const a of labels) if (a !== c) fp += matrix[a][c];
  // FN and support: row c.
  for (const p of labels) {
    support += matrix[c][p];
    if (p !== c) fn += matrix[c][p];
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { category: c, support, precision, recall, f1 };
}

export function evaluate(preds: Prediction[], labels: string[]): EvalReport {
  const matrix = confusionMatrix(preds, labels);

  let correct = 0;
  for (const p of preds) if (p.expected === p.predicted) correct += 1;
  const accuracy = preds.length === 0 ? 0 : correct / preds.length;

  // Only average over categories that actually appear in the test set,
  // so absent categories don't drag the macro scores to zero.
  const present = labels.filter((c) => preds.some((p) => p.expected === c));
  const perCategory = present.map((c) => categoryMetrics(c, labels, matrix));

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const macroPrecision = mean(perCategory.map((m) => m.precision));
  const macroRecall = mean(perCategory.map((m) => m.recall));
  const macroF1 = mean(perCategory.map((m) => m.f1));

  return {
    total: preds.length,
    accuracy,
    macroPrecision,
    macroRecall,
    macroF1,
    perCategory,
    confusion: matrix,
    labels,
  };
}
