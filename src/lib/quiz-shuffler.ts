/**
 * Utility functions for randomizing multiple-choice quiz question options and answer keys.
 */

export interface QuizOption {
  id: string;
  text: string;
  [key: string]: any;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId?: string;
  correctId?: string;
  conceptTag?: string;
  explanation?: string;
  [key: string]: any;
}

/**
 * Randomizes option positions for a single quiz question while re-mapping option IDs ('A', 'B', 'C', 'D')
 * and preserving correct answer references.
 */
export function shuffleQuestionOptions<T extends Record<string, any>>(question: T): T {
  if (!question || !Array.isArray(question.options) || question.options.length === 0) {
    return question;
  }

  const correctKey = 'correctOptionId' in question 
    ? 'correctOptionId' 
    : ('correctId' in question ? 'correctId' : null);
  const targetCorrectId = correctKey ? (question as any)[correctKey] : null;

  const labels = ['A', 'B', 'C', 'D'];

  // Track original option text and whether it was marked as correct
  const normalized = question.options.map((opt: any, idx: number) => {
    const originalId = typeof opt === 'string' 
      ? (labels[idx] || String(idx)) 
      : opt?.id;
    const text = typeof opt === 'string' ? opt : (opt?.text || '');
    const isCorrect = targetCorrectId ? originalId === targetCorrectId : idx === 0;
    
    return {
      originalId,
      text,
      isCorrect,
      rawObj: typeof opt === 'object' && opt !== null ? opt : {},
    };
  });

  // Fisher-Yates Shuffle
  const shuffled = [...normalized];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Re-assign IDs (A, B, C, D) and find updated correct answer ID
  let newCorrectId = 'A';

  const remappedOptions = shuffled.map((opt, idx) => {
    const newId = labels[idx] || String.fromCharCode(65 + idx);
    if (opt.isCorrect) {
      newCorrectId = newId;
    }
    return {
      ...opt.rawObj,
      id: newId,
      text: opt.text,
    };
  });

  const updated = {
    ...question,
    options: remappedOptions,
  };

  if (correctKey) {
    (updated as any)[correctKey] = newCorrectId;
  }

  return updated;
}

/**
 * Shuffles all question options across a complete quiz structure.
 */
export function shuffleQuiz<T extends Record<string, any>>(quiz: T): T {
  if (!quiz) return quiz;

  if (Array.isArray(quiz.questions)) {
    return {
      ...quiz,
      questions: quiz.questions.map((q: any) => shuffleQuestionOptions(q)),
    };
  }

  if (quiz.microQuiz) {
    return {
      ...quiz,
      microQuiz: shuffleQuestionOptions(quiz.microQuiz),
    };
  }

  if (Array.isArray(quiz.options)) {
    return shuffleQuestionOptions(quiz);
  }

  return quiz;
}
