export const DAILY_CHALLENGE_TOPICS = [
  "The History of the Apollo 11 Mission",
  "How Quantum Computers Work",
  "The Rise and Fall of the Roman Empire",
  "Artificial Intelligence and Neural Networks",
  "The Biology of Sleep and Dreams",
  "The Psychology of Habit Formation",
  "Climate Change and Renewable Energy",
  "The Evolution of Human Language",
  "Black Holes and the Event Horizon",
  "The Economics of Cryptocurrency",
  "The Silk Road and Global Trade",
  "CRISPR and Genetic Engineering",
  "The Philosophy of Stoicism",
  "Space Exploration in the 21st Century",
  "The Renaissance Art Movement",
  "Cybersecurity and Data Privacy",
  "The Physics of Roller Coasters",
  "The Structure of the Human Brain",
  "Marine Biology and Deep Sea Ecosystems",
  "The Industrial Revolution",
  "Cognitive Biases in Decision Making",
  "The Science of Fermentation",
  "History of the Internet",
  "Ancient Egyptian Mythology",
  "The Mechanics of Flight",
  "Sustainable Agriculture Practices",
  "The Life Cycle of a Star",
  "Buddhism and Mindfulness",
  "The French Revolution",
  "Nanotechnology Applications",
  "The Geopolitics of Oil",
  "The Science of Music and Acoustics",
  "Volcanoes and Plate Tectonics",
  "The History of Video Games",
  "Epidemiology and Pandemics",
  "The Space Race",
  "The Architecture of Ancient Rome",
  "The Chemistry of Cooking",
  "The Psychology of Color",
  "The History of Cryptography",
  "The Origin of Species (Evolution)",
  "The Manhattan Project",
  "The Science of Memory",
  "The History of Photography",
  "The Solar System and Planets",
  "The Philosophy of Existentialism",
  "The Economics of the Great Depression",
  "The History of Aviation",
  "The Science of Climate Models",
  "The Psychology of Leadership"
];

/**
 * Returns a deterministic daily challenge topic based on the date string.
 * @param dateString Format: YYYY-MM-DD
 */
export function getDailyChallenge(dateString: string) {
  // Simple deterministic hash based on date string
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Make positive and modulo by array length
  const index = Math.abs(hash) % DAILY_CHALLENGE_TOPICS.length;
  
  return {
    topic: DAILY_CHALLENGE_TOPICS[index],
    xpReward: 500,
    dateString
  };
}

/**
 * Helper to get today's date string in local timezone (YYYY-MM-DD)
 */
export function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
