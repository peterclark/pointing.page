import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Room name generator utility
const adjectives = [
  "Purple",
  "Jazzy",
  "Happy",
  "Bouncy",
  "Clever",
  "Swift",
  "Bright",
  "Cosmic",
  "Electric",
  "Funky",
  "Mighty",
  "Noble",
  "Brave",
  "Jolly",
  "Sneaky",
  "Fancy",
  "Rusty",
  "Shiny",
  "Smoky",
  "Dusty",
  "Sunny",
  "Cloudy",
  "Stormy",
  "Windy",
  "Frosty",
  "Blazing",
  "Golden",
  "Silver",
  "Crimson",
  "Azure",
  "Emerald",
  "Violet",
  "Amber",
  "Ivory",
  "Coral",
  "Jade",
  "Ruby",
  "Sapphire",
  "Pearl",
  "Onyx",
  "Lucky",
  "Mystic",
  "Ancient",
  "Modern",
  "Vintage",
  "Classic",
  "Epic",
  "Legendary",
  "Magical",
  "Stellar",
  "Lunar",
  "Solar",
  "Cosmic",
  "Galactic",
  "Quantum",
  "Atomic",
  "Turbo",
  "Ultra",
  "Super",
  "Mega",
  "Hyper",
  "Ninja",
  "Pirate",
  "Robot",
  "Laser",
  "Neon",
  "Pixel",
  "Digital",
  "Cyber",
  "Retro",
  "Funky",
  "Groovy",
  "Disco",
  "Jazz",
  "Blues",
  "Rock",
  "Metal",
  "Punk",
  "Techno",
  "Electro",
  "Gentle",
  "Fierce",
  "Wild",
  "Calm",
  "Quiet",
  "Loud",
  "Smooth",
  "Rough",
  "Tiny",
  "Giant",
  "Mini",
  "Jumbo",
  "Micro",
  "Macro",
  "Nano",
  "Mega",
  "Silly",
  "Wise",
  "Smart",
  "Witty",
  "Goofy",
  "Zippy",
  "Zany",
  "Wacky",
];

const nouns = [
  "Elephant",
  "Giraffe",
  "Penguin",
  "Rocket",
  "Dragon",
  "Phoenix",
  "Tiger",
  "Dolphin",
  "Eagle",
  "Wolf",
  "Panda",
  "Koala",
  "Falcon",
  "Hawk",
  "Owl",
  "Raven",
  "Bear",
  "Lion",
  "Leopard",
  "Cheetah",
  "Jaguar",
  "Panther",
  "Lynx",
  "Bobcat",
  "Whale",
  "Shark",
  "Octopus",
  "Jellyfish",
  "Starfish",
  "Seahorse",
  "Turtle",
  "Crab",
  "Butterfly",
  "Dragonfly",
  "Ladybug",
  "Beetle",
  "Cricket",
  "Grasshopper",
  "Firefly",
  "Moth",
  "Unicorn",
  "Pegasus",
  "Griffin",
  "Sphinx",
  "Hydra",
  "Kraken",
  "Basilisk",
  "Chimera",
  "Thunder",
  "Lightning",
  "Comet",
  "Meteor",
  "Nova",
  "Eclipse",
  "Aurora",
  "Nebula",
  "Galaxy",
  "Planet",
  "Asteroid",
  "Satellite",
  "Cosmos",
  "Orbit",
  "Constellation",
  "Pulsar",
  "Mountain",
  "Valley",
  "River",
  "Ocean",
  "Desert",
  "Forest",
  "Jungle",
  "Meadow",
  "Canyon",
  "Volcano",
  "Island",
  "Glacier",
  "Waterfall",
  "Cave",
  "Summit",
  "Plateau",
  "Thunder",
  "Storm",
  "Breeze",
  "Typhoon",
  "Cyclone",
  "Tornado",
  "Hurricane",
  "Gale",
  "Crystal",
  "Diamond",
  "Gemstone",
  "Prism",
  "Jewel",
  "Treasure",
  "Crown",
  "Scepter",
  "Knight",
  "Wizard",
  "Archer",
  "Warrior",
  "Samurai",
  "Ninja",
];

/**
 * Generates a random room name in "Adjective-Noun" format
 * Example: "Purple-Elephant", "Jazzy-Giraffe"
 */
export function generateRoomName(): string {
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective}-${randomNoun}`;
}

/**
 * Formats an 8-character room code to "ABC1-2345" display format
 * Converts to uppercase and inserts hyphen after 4th character
 */
export function formatRoomCode(code: string): string {
  const upperCode = code.toUpperCase();
  return `${upperCode.slice(0, 4)}-${upperCode.slice(4)}`;
}

/**
 * Gets or generates a participant ID from localStorage
 * Generates a new UUID v4 if one doesn't exist
 */
export function getParticipantId(): string {
  const key = "participant_id";
  const existingId = localStorage.getItem(key);

  if (existingId) {
    return existingId;
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(key, newId);
  return newId;
}

/**
 * Retrieves the saved participant name from localStorage
 * Returns null if no name is saved
 */
export function getParticipantName(): string | null {
  return localStorage.getItem("participant_name");
}

/**
 * Saves the participant name to localStorage
 */
export function saveParticipantName(name: string): void {
  localStorage.setItem("participant_name", name);
}

/**
 * Copies text to clipboard using the Clipboard API
 * Returns true on success, false on failure
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_error) {
    return false;
  }
}

// Point scale constants
export const FIBONACCI_SCALE = [
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "?",
] as const;
export const TSHIRT_SCALE = ["XS", "S", "M", "L", "XL", "XXL", "?"] as const;

/**
 * Gets the Fibonacci point scale values
 * @returns Array of Fibonacci values including "?"
 */
export function getFibonacciValues(): readonly string[] {
  return FIBONACCI_SCALE;
}

/**
 * Gets the T-shirt size point scale values
 * @returns Array of T-shirt size values including "?"
 */
export function getTshirtValues(): readonly string[] {
  return TSHIRT_SCALE;
}

/**
 * Gets point scale values based on the scale type
 * @param scale - The point scale type ("fibonacci" or "t-shirt")
 * @returns Array of point values for the specified scale
 */
export function getPointScaleValues(
  scale: "fibonacci" | "t-shirt"
): readonly string[] {
  return scale === "fibonacci" ? FIBONACCI_SCALE : TSHIRT_SCALE;
}

/**
 * Consensus calculation result for Fibonacci scale
 */
export interface FibonacciConsensus {
  average: number;
  consensus: number;
  outlierThreshold: number;
}

/**
 * Calculates consensus for Fibonacci scale votes
 * - Filters out "?" votes
 * - Calculates average of numeric votes
 * - Rounds to nearest Fibonacci number
 * - Outlier threshold is 2 steps away from consensus
 *
 * @param votes - Array of vote point values
 * @returns Consensus calculation with average, rounded consensus, and outlier threshold
 */
export function calculateFibonacciConsensus(
  votes: string[]
): FibonacciConsensus {
  // Filter out "?" votes and convert to numbers
  const numericVotes = votes
    .filter((v) => v !== "?")
    .map((v) => parseInt(v, 10))
    .filter((v) => !isNaN(v));

  // If no valid votes, return zeros
  if (numericVotes.length === 0) {
    return { average: 0, consensus: 0, outlierThreshold: 0 };
  }

  // Calculate average
  const sum = numericVotes.reduce((acc, val) => acc + val, 0);
  const average = sum / numericVotes.length;

  // Round to nearest Fibonacci number
  const fibSequence = [1, 2, 3, 5, 8, 13, 21];
  const consensus = fibSequence.reduce((prev, curr) =>
    Math.abs(curr - average) < Math.abs(prev - average) ? curr : prev
  );

  // Outlier threshold is 2 steps away from consensus in the sequence
  const outlierThreshold = 2;

  return { average, consensus, outlierThreshold };
}

/**
 * Consensus calculation result for T-shirt scale
 */
export interface TshirtConsensus {
  mode: string;
  consensus: string;
  outlierThreshold: number;
}

/**
 * Calculates consensus for T-shirt scale votes
 * - Filters out "?" votes
 * - Calculates mode (most common value)
 * - Outlier threshold is 1 step away from mode
 *
 * @param votes - Array of vote point values
 * @returns Consensus calculation with mode, consensus value, and outlier threshold
 */
export function calculateTshirtConsensus(votes: string[]): TshirtConsensus {
  // Filter out "?" votes
  const validVotes = votes.filter((v) => v !== "?");

  // If no valid votes, return empty result
  if (validVotes.length === 0) {
    return { mode: "", consensus: "", outlierThreshold: 1 };
  }

  // Count occurrences of each value
  const counts = new Map<string, number>();
  for (const vote of validVotes) {
    counts.set(vote, (counts.get(vote) || 0) + 1);
  }

  // Find the maximum count
  const maxCount = Math.max(...counts.values());

  // Get all values that have the maximum count (handles ties)
  const modesArray = Array.from(counts.entries())
    .filter(([_, count]) => count === maxCount)
    .map(([value]) => value);

  // If there's a tie, pick the median value based on T-shirt size order
  let mode: string;
  if (modesArray.length > 1) {
    // Define T-shirt size order for sorting
    const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL"];
    const sortedModes = modesArray.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a);
      const indexB = sizeOrder.indexOf(b);
      return indexA - indexB;
    });
    // Pick the middle value (median)
    mode = sortedModes[Math.floor(sortedModes.length / 2)];
  } else {
    mode = modesArray[0];
  }

  return { mode, consensus: mode, outlierThreshold: 1 };
}

/**
 * Checks if a vote is within consensus range
 * - For Fibonacci: within 1-2 steps of rounded average
 * - For T-shirt: within 1 step of mode
 *
 * @param vote - The vote value to check
 * @param consensus - The consensus value (number for Fibonacci, string for T-shirt)
 * @param scale - The point scale type
 * @returns true if vote is within consensus range, false if outlier
 */
export function isConsensusVote(
  vote: string,
  consensus: string | number,
  scale: "fibonacci" | "t-shirt"
): boolean {
  // "?" votes are never considered consensus
  if (vote === "?") {
    return false;
  }

  if (scale === "fibonacci") {
    const voteNum = parseInt(vote, 10);
    const consensusNum =
      typeof consensus === "number"
        ? consensus
        : parseInt(consensus as string, 10);

    if (isNaN(voteNum) || isNaN(consensusNum)) {
      return false;
    }

    // Get index positions in Fibonacci sequence
    const fibSequence = [1, 2, 3, 5, 8, 13, 21];
    const voteIndex = fibSequence.indexOf(voteNum);
    const consensusIndex = fibSequence.indexOf(consensusNum);

    if (voteIndex === -1 || consensusIndex === -1) {
      return false;
    }

    // Within 1-2 steps is consensus (green)
    const steps = Math.abs(voteIndex - consensusIndex);
    return steps <= 2;
  } else {
    // T-shirt scale
    const sequence = ["XS", "S", "M", "L", "XL", "XXL"];
    const voteIndex = sequence.indexOf(vote);
    const consensusIndex = sequence.indexOf(consensus as string);

    if (voteIndex === -1 || consensusIndex === -1) {
      return false;
    }

    // Within 1 step is consensus (green)
    const steps = Math.abs(voteIndex - consensusIndex);
    return steps <= 1;
  }
}

/**
 * Sorts votes by their point value in ascending order
 * - Fibonacci: numeric sort with "?" at the end
 * - T-shirt: predefined order with "?" at the end
 *
 * @param votes - Array of vote objects with point_value property
 * @param scale - The point scale type
 * @returns Sorted array of votes
 */
export function sortVotesByValue<T extends { point_value: string }>(
  votes: T[],
  scale: "fibonacci" | "t-shirt"
): T[] {
  if (scale === "fibonacci") {
    return [...votes].sort((a, b) => {
      // "?" goes to the end
      if (a.point_value === "?") return 1;
      if (b.point_value === "?") return -1;

      const aNum = parseInt(a.point_value, 10);
      const bNum = parseInt(b.point_value, 10);
      return aNum - bNum;
    });
  } else {
    // T-shirt scale
    const order = ["XS", "S", "M", "L", "XL", "XXL", "?"];
    return [...votes].sort((a, b) => {
      const aIndex = order.indexOf(a.point_value);
      const bIndex = order.indexOf(b.point_value);
      return aIndex - bIndex;
    });
  }
}

/**
 * Vote object with participant information
 */
export interface VoteWithParticipant {
  point_value: string;
  is_revealed: boolean;
  participant_id: string;
}

/**
 * Filters votes to only show those visible to the current participant
 * - Always shows current participant's own votes
 * - Only shows other participants' votes if is_revealed is true
 * This enforces vote privacy until the leader reveals
 *
 * @param votes - Array of vote objects
 * @param currentParticipantId - The current participant's ID
 * @returns Filtered array of visible votes
 */
export function filterVisibleVotes<T extends VoteWithParticipant>(
  votes: T[],
  currentParticipantId: string
): T[] {
  return votes.filter(
    (vote) => vote.participant_id === currentParticipantId || vote.is_revealed
  );
}
