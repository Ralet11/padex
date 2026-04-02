const { sequelize } = require('../database');

// Import all models
const User = require('./User');
const Court = require('./Court');
const Venue = require('./Venue');
const Slot = require('./Slot');
const AvailabilityRule = require('./AvailabilityRule');
const AvailabilityException = require('./AvailabilityException');
const CourtClosure = require('./CourtClosure');
const Match = require('./Match');
const MatchPlayer = require('./MatchPlayer');
const League = require('./League');
const Season = require('./Season');
const CompetitiveStanding = require('./CompetitiveStanding');
const CompetitiveResult = require('./CompetitiveResult');
const ReputationProfile = require('./ReputationProfile');
const ReputationRating = require('./ReputationRating');
const Connection = require('./Connection');
const Message = require('./Message');
const Rating = require('./Rating');
const Notification = require('./Notification');
const CalibrationVote = require('./CalibrationVote');

// ========================
// Associations Definitions
// ========================

// Venue <-> Court
Venue.hasMany(Court, { foreignKey: 'venue_id' });
Court.belongsTo(Venue, { foreignKey: 'venue_id' });

// Slot <-> Court
Court.hasMany(Slot, { foreignKey: 'court_id' });
Slot.belongsTo(Court, { foreignKey: 'court_id' });

// Venue <-> AvailabilityRule
Venue.hasMany(AvailabilityRule, { foreignKey: 'venue_id' });
AvailabilityRule.belongsTo(Venue, { foreignKey: 'venue_id' });

// Venue/Court <-> AvailabilityException
Venue.hasMany(AvailabilityException, { foreignKey: 'venue_id' });
AvailabilityException.belongsTo(Venue, { foreignKey: 'venue_id' });
Court.hasMany(AvailabilityException, { foreignKey: 'court_id' });
AvailabilityException.belongsTo(Court, { foreignKey: 'court_id' });

// Venue/Court <-> CourtClosure
Venue.hasMany(CourtClosure, { foreignKey: 'venue_id' });
CourtClosure.belongsTo(Venue, { foreignKey: 'venue_id' });
Court.hasMany(CourtClosure, { foreignKey: 'court_id' });
CourtClosure.belongsTo(Court, { foreignKey: 'court_id' });

// Venue <-> User (Manager)
User.hasMany(Venue, { foreignKey: 'manager_id', as: 'ManagedVenues' });
Venue.belongsTo(User, { foreignKey: 'manager_id', as: 'Manager' });

// Match <-> User (Creator)
User.hasMany(Match, { foreignKey: 'creator_id', as: 'CreatedMatches' });
Match.belongsTo(User, { foreignKey: 'creator_id', as: 'Creator' });

// Match <-> Slot
Slot.hasMany(Match, { foreignKey: 'slot_id' });
Match.belongsTo(Slot, { foreignKey: 'slot_id' });

// Match <-> User (Players / MatchPlayer join table)
Match.hasMany(MatchPlayer, { foreignKey: 'match_id', as: 'Players' });
MatchPlayer.belongsTo(Match, { foreignKey: 'match_id' });

User.hasMany(MatchPlayer, { foreignKey: 'user_id' });
MatchPlayer.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

// League / Season / Standing
League.hasMany(Season, { foreignKey: 'league_id', as: 'Seasons' });
Season.belongsTo(League, { foreignKey: 'league_id', as: 'League' });

League.hasMany(User, { foreignKey: 'league_id', as: 'Players' });
User.belongsTo(League, { foreignKey: 'league_id', as: 'League' });

Season.hasMany(User, { foreignKey: 'season_id', as: 'Players' });
User.belongsTo(Season, { foreignKey: 'season_id', as: 'Season' });

League.hasMany(CompetitiveStanding, { foreignKey: 'league_id', as: 'Standings' });
CompetitiveStanding.belongsTo(League, { foreignKey: 'league_id', as: 'League' });

Season.hasMany(CompetitiveStanding, { foreignKey: 'season_id', as: 'Standings' });
CompetitiveStanding.belongsTo(Season, { foreignKey: 'season_id', as: 'Season' });

User.hasMany(CompetitiveStanding, { foreignKey: 'user_id', as: 'CompetitiveStandings' });
CompetitiveStanding.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

Season.hasMany(Match, { foreignKey: 'competitive_season_id', as: 'Matches' });
Match.belongsTo(Season, { foreignKey: 'competitive_season_id', as: 'CompetitiveSeason' });

Match.hasOne(CompetitiveResult, { foreignKey: 'match_id', as: 'CompetitiveResult' });
CompetitiveResult.belongsTo(Match, { foreignKey: 'match_id', as: 'Match' });

Season.hasMany(CompetitiveResult, { foreignKey: 'season_id', as: 'CompetitiveResults' });
CompetitiveResult.belongsTo(Season, { foreignKey: 'season_id', as: 'Season' });

User.hasOne(ReputationProfile, { foreignKey: 'user_id', as: 'ReputationProfile' });
ReputationProfile.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

ReputationProfile.hasMany(ReputationRating, { foreignKey: 'profile_id', as: 'Ratings' });
ReputationRating.belongsTo(ReputationProfile, { foreignKey: 'profile_id', as: 'Profile' });

User.hasMany(ReputationRating, { foreignKey: 'rater_id', as: 'SubmittedReputationRatings' });
ReputationRating.belongsTo(User, { foreignKey: 'rater_id', as: 'Rater' });

User.hasMany(ReputationRating, { foreignKey: 'rated_id', as: 'ReceivedReputationRatings' });
ReputationRating.belongsTo(User, { foreignKey: 'rated_id', as: 'Rated' });

Match.hasMany(ReputationRating, { foreignKey: 'match_id', as: 'ReputationRatings' });
ReputationRating.belongsTo(Match, { foreignKey: 'match_id', as: 'Match' });

// Connection <-> User (Requester / Addressee)
User.hasMany(Connection, { foreignKey: 'requester_id', as: 'SentConnections' });
Connection.belongsTo(User, { foreignKey: 'requester_id', as: 'Requester' });

User.hasMany(Connection, { foreignKey: 'addressee_id', as: 'ReceivedConnections' });
Connection.belongsTo(User, { foreignKey: 'addressee_id', as: 'Addressee' });

// Message <-> Connection
Connection.hasMany(Message, { foreignKey: 'connection_id' });
Message.belongsTo(Connection, { foreignKey: 'connection_id' });

// Message <-> User (Sender)
User.hasMany(Message, { foreignKey: 'sender_id' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'Sender' });

// Rating <-> User (Rater / Rated)
User.hasMany(Rating, { foreignKey: 'rater_id', as: 'GivenRatings' });
Rating.belongsTo(User, { foreignKey: 'rater_id', as: 'Rater' });

User.hasMany(Rating, { foreignKey: 'rated_id', as: 'ReceivedRatings' });
Rating.belongsTo(User, { foreignKey: 'rated_id', as: 'Rated' });

// Rating <-> Match
Match.hasMany(Rating, { foreignKey: 'match_id' });
Rating.belongsTo(Match, { foreignKey: 'match_id' });

// Notification <-> User
User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

// CalibrationVote <-> User (Voter / Target)
User.hasMany(CalibrationVote, { foreignKey: 'voter_id', as: 'CastCalibrationVotes' });
CalibrationVote.belongsTo(User, { foreignKey: 'voter_id', as: 'Voter' });

User.hasMany(CalibrationVote, { foreignKey: 'target_id', as: 'ReceivedCalibrationVotes' });
CalibrationVote.belongsTo(User, { foreignKey: 'target_id', as: 'Target' });

// CalibrationVote <-> Match
Match.hasMany(CalibrationVote, { foreignKey: 'match_id' });
CalibrationVote.belongsTo(Match, { foreignKey: 'match_id' });

// Export Models and sequelize connection
module.exports = {
    sequelize,
    User,
    Court,
    Venue,
    Slot,
    AvailabilityRule,
    AvailabilityException,
    CourtClosure,
    Match,
    MatchPlayer,
    League,
    Season,
    CompetitiveStanding,
    CompetitiveResult,
    ReputationProfile,
    ReputationRating,
    Connection,
    Message,
    Rating,
    Notification,
    CalibrationVote
};
