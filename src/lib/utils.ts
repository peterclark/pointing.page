import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Room name generator utility
const adjectives = [
  "Purple", "Jazzy", "Happy", "Bouncy", "Clever", "Swift", "Bright", "Cosmic",
  "Electric", "Funky", "Mighty", "Noble", "Brave", "Jolly", "Sneaky", "Fancy",
  "Rusty", "Shiny", "Smoky", "Dusty", "Sunny", "Cloudy", "Stormy", "Windy",
  "Frosty", "Blazing", "Golden", "Silver", "Crimson", "Azure", "Emerald", "Violet",
  "Amber", "Ivory", "Coral", "Jade", "Ruby", "Sapphire", "Pearl", "Onyx",
  "Lucky", "Mystic", "Ancient", "Modern", "Vintage", "Classic", "Epic", "Legendary",
  "Magical", "Stellar", "Lunar", "Solar", "Cosmic", "Galactic", "Quantum", "Atomic",
  "Turbo", "Ultra", "Super", "Mega", "Hyper", "Ninja", "Pirate", "Robot",
  "Laser", "Neon", "Pixel", "Digital", "Cyber", "Retro", "Funky", "Groovy",
  "Disco", "Jazz", "Blues", "Rock", "Metal", "Punk", "Techno", "Electro",
  "Gentle", "Fierce", "Wild", "Calm", "Quiet", "Loud", "Smooth", "Rough",
  "Tiny", "Giant", "Mini", "Jumbo", "Micro", "Macro", "Nano", "Mega",
  "Silly", "Wise", "Smart", "Witty", "Goofy", "Zippy", "Zany", "Wacky"
];

const nouns = [
  "Elephant", "Giraffe", "Penguin", "Rocket", "Dragon", "Phoenix", "Tiger", "Dolphin",
  "Eagle", "Wolf", "Panda", "Koala", "Falcon", "Hawk", "Owl", "Raven",
  "Bear", "Lion", "Leopard", "Cheetah", "Jaguar", "Panther", "Lynx", "Bobcat",
  "Whale", "Shark", "Octopus", "Jellyfish", "Starfish", "Seahorse", "Turtle", "Crab",
  "Butterfly", "Dragonfly", "Ladybug", "Beetle", "Cricket", "Grasshopper", "Firefly", "Moth",
  "Unicorn", "Pegasus", "Griffin", "Sphinx", "Hydra", "Kraken", "Basilisk", "Chimera",
  "Thunder", "Lightning", "Comet", "Meteor", "Nova", "Eclipse", "Aurora", "Nebula",
  "Galaxy", "Planet", "Asteroid", "Satellite", "Cosmos", "Orbit", "Constellation", "Pulsar",
  "Mountain", "Valley", "River", "Ocean", "Desert", "Forest", "Jungle", "Meadow",
  "Canyon", "Volcano", "Island", "Glacier", "Waterfall", "Cave", "Summit", "Plateau",
  "Thunder", "Storm", "Breeze", "Typhoon", "Cyclone", "Tornado", "Hurricane", "Gale",
  "Crystal", "Diamond", "Gemstone", "Prism", "Jewel", "Treasure", "Crown", "Scepter",
  "Knight", "Wizard", "Archer", "Warrior", "Samurai", "Ninja"
];

/**
 * Generates a random room name in "Adjective-Noun" format
 * Example: "Purple-Elephant", "Jazzy-Giraffe"
 */
export function generateRoomName(): string {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
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
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}
