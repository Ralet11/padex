# Social Specification

## Purpose

The SocialScreen encoding bug SHALL be fixed. All text content must render correctly with proper UTF-8 encoding, especially accented characters (á, é, í, ó, ú, ñ, ü) and special symbols.

## Requirements

### Requirement: Correct Text Encoding

All text rendered in SocialScreen and PlayerProfileScreen SHALL display correctly without mojibake, replacement characters, or encoding artifacts.

#### Scenario: Accented text renders correctly

- GIVEN a player name contains accented characters (e.g., "José", "Muñoz")
- WHEN the name is displayed on screen
- THEN the characters render correctly without garbling

#### Scenario: API response is parsed correctly

- GIVEN the social API returns JSON with UTF-8 encoded strings
- WHEN the response is parsed
- THEN the encoding is preserved and no characters are corrupted

#### Scenario: Special symbols render correctly

- GIVEN content includes special characters (emojis, symbols)
- WHEN displayed in the social feed or profile
- THEN all characters render without replacement characters or empty boxes

### Requirement: No Fallback to Latin-1

The app SHALL NOT assume or force Latin-1 encoding. All network requests MUST explicitly use UTF-8.

#### Scenario: Request headers specify UTF-8

- GIVEN a social API request is made
- WHEN inspecting the request headers
- THEN Content-Type includes `charset=utf-8`
