import { shuffleQuestionOptions, shuffleQuiz } from '@/lib/quiz-shuffler';

describe('quiz-shuffler', () => {
  it('preserves correct answer association after option shuffling', () => {
    const question = {
      id: 'q1',
      question: 'What is the capital of France?',
      options: [
        { id: 'A', text: 'Paris' },
        { id: 'B', text: 'London' },
        { id: 'C', text: 'Berlin' },
        { id: 'D', text: 'Madrid' },
      ],
      correctOptionId: 'A',
    };

    // Run shuffle multiple times to test re-mapping
    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleQuestionOptions(question);
      
      // Verify exactly 4 options with IDs A, B, C, D
      expect(shuffled.options.map(o => o.id)).toEqual(['A', 'B', 'C', 'D']);
      
      // Find option corresponding to new correctOptionId
      const correctOpt = shuffled.options.find(o => o.id === shuffled.correctOptionId);
      expect(correctOpt).toBeDefined();
      expect(correctOpt?.text).toBe('Paris');
    }
  });

  it('shuffles full quiz structure with questions array', () => {
    const quiz = {
      topic: 'Geography',
      difficulty: 'easy',
      questions: [
        {
          id: 'q1',
          question: 'Capital of Japan?',
          options: [
            { id: 'A', text: 'Tokyo' },
            { id: 'B', text: 'Kyoto' },
            { id: 'C', text: 'Osaka' },
            { id: 'D', text: 'Nagoya' },
          ],
          correctOptionId: 'A',
        },
        {
          id: 'q2',
          question: 'Capital of Italy?',
          options: [
            { id: 'A', text: 'Rome' },
            { id: 'B', text: 'Venice' },
            { id: 'C', text: 'Milan' },
            { id: 'D', text: 'Naples' },
          ],
          correctOptionId: 'A',
        },
      ],
    };

    const shuffledQuiz = shuffleQuiz(quiz);
    expect(shuffledQuiz.questions.length).toBe(2);

    const q1Correct = shuffledQuiz.questions[0].options.find(o => o.id === shuffledQuiz.questions[0].correctOptionId);
    expect(q1Correct?.text).toBe('Tokyo');

    const q2Correct = shuffledQuiz.questions[1].options.find(o => o.id === shuffledQuiz.questions[1].correctOptionId);
    expect(q2Correct?.text).toBe('Rome');
  });

  it('handles microQuiz structure with correctId key', () => {
    const microQuiz = {
      question: 'Which element has atomic number 1?',
      options: [
        { id: 'A', text: 'Hydrogen' },
        { id: 'B', text: 'Helium' },
        { id: 'C', text: 'Lithium' },
        { id: 'D', text: 'Beryllium' },
      ],
      correctId: 'A',
      explanation: 'Hydrogen is atomic number 1.',
    };

    const shuffled = shuffleQuestionOptions(microQuiz);
    expect(shuffled.options.map(o => o.id)).toEqual(['A', 'B', 'C', 'D']);
    
    const correctOpt = shuffled.options.find(o => o.id === shuffled.correctId);
    expect(correctOpt?.text).toBe('Hydrogen');
  });
});
