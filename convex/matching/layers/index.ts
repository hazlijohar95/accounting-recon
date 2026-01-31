/**
 * Matching Layers - Re-exports
 *
 * Provides a clean interface to all matching layer implementations.
 * Each layer is independently testable and can be used in isolation.
 */

// Types
export * from "./types";

// Layer implementations
export { ExactMatchLayer, layer1ExactMatch } from "./exact";
export { WindowMatchLayer, layer2WindowMatch } from "./window";
export { ReferenceMatchLayer, layer3ReferenceMatch } from "./reference";
export { FuzzyMatchLayer, layer4FuzzyMatch } from "./fuzzy";
export { SemanticMatchLayer, formatForLLM, convertLLMSuggestions } from "./semantic";

// Create all layers for pipeline usage
import { ExactMatchLayer } from "./exact";
import { WindowMatchLayer } from "./window";
import { ReferenceMatchLayer } from "./reference";
import { FuzzyMatchLayer } from "./fuzzy";
import { MatchingLayer } from "./types";

/**
 * Get all non-LLM matching layers in priority order
 */
export function getNonLLMLayers(): MatchingLayer[] {
  return [
    new ExactMatchLayer(),
    new WindowMatchLayer(),
    new ReferenceMatchLayer(),
    new FuzzyMatchLayer(),
  ];
}
